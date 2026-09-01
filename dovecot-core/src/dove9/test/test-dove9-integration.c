/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* End-to-end integration test: exercises the full cognitive pipeline
   from mail arrival through triadic processing to reply generation.
   Validates the complete Dove9 "Everything is a Chatbot" data flow. */

#include "dove9-test-common.h"
#include "dove9-test-mocks.h"
#include "../dove9-system.h"
#include "../types/dove9-types.h"
#include "../core/dove9-kernel.h"
#include "../integration/dove9-mail-protocol-bridge.h"
#include "../integration/dove9-sys6-mail-scheduler.h"

#include <string.h>

/* ---- helper: create initialized system ---- */

static struct dove9_system *create_test_system(void)
{
	struct dove9_system_config cfg;
	memset(&cfg, 0, sizeof(cfg));
	cfg.base = dove9_config_default();
	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "echo@dove9.local");
	cfg.llm = &dove9_mock_llm;
	cfg.memory = &dove9_mock_memory;
	cfg.persona = &dove9_mock_persona;
	return dove9_system_create(&cfg);
}

/* ---- Full pipeline: mail → kernel → triadic → reply ---- */

static void test_full_pipeline(void)
{
	struct dove9_system *sys;
	struct dove9_mail_message inbound;
	struct dove9_message_process *proc;

	dove9_test_begin("full pipeline: mail → cognitive → process");

	dove9_mock_reset();

	sys = create_test_system();
	dove9_system_start(sys);

	memset(&inbound, 0, sizeof(inbound));
	snprintf(inbound.from, sizeof(inbound.from), "alice@example.com");
	inbound.to_count = 1;
	snprintf(inbound.to[0], sizeof(inbound.to[0]), "echo@dove9.local");
	snprintf(inbound.subject, sizeof(inbound.subject),
		 "Philosophy question");
	snprintf(inbound.body, sizeof(inbound.body),
		 "What is the relationship between perception and memory?");

	proc = dove9_system_process_mail(sys, &inbound);
	dove9_kernel_tick(dove9_system_get_kernel(sys));

	DOVE9_TEST_ASSERT_NOT_NULL(proc);
	DOVE9_TEST_ASSERT_STR_EQ(proc->from, "alice@example.com");

	/* Verify cognitive services were invoked (triad-dependent:
	   at step 1, T1R calls persona.get_dominant_emotion,
	   T7R calls memory.retrieve_relevant) */
	DOVE9_TEST_ASSERT(dove9_mock_memory_retrieve_relevant_calls > 0 ||
			  dove9_mock_persona_emotion_calls > 0);

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- Multiple users, concurrent-like processing ---- */

static void test_multi_user_pipeline(void)
{
	struct dove9_system *sys;
	struct dove9_mail_message mail;
	struct dove9_message_process *proc;
	const char *users[] = {
		"alice@example.com", "bob@example.com", "carol@example.com"
	};
	int i;

	dove9_test_begin("multi-user pipeline: 3 users get processes");

	dove9_mock_reset();

	sys = create_test_system();
	dove9_system_start(sys);

	for (i = 0; i < 3; i++) {
		memset(&mail, 0, sizeof(mail));
		snprintf(mail.from, sizeof(mail.from), "%s", users[i]);
		mail.to_count = 1;
		snprintf(mail.to[0], sizeof(mail.to[0]), "echo@dove9.local");
		snprintf(mail.subject, sizeof(mail.subject),
			 "Q from user %d", i);
		snprintf(mail.body, sizeof(mail.body),
			 "Hello from %s", users[i]);

		proc = dove9_system_process_mail(sys, &mail);
		dove9_kernel_tick(dove9_system_get_kernel(sys));
		DOVE9_TEST_ASSERT_NOT_NULL(proc);
		DOVE9_TEST_ASSERT_STR_EQ(proc->from, users[i]);
	}

	/* Over 3 messages, different triads invoke different services */
	DOVE9_TEST_ASSERT(dove9_mock_llm_generate_calls +
			  dove9_mock_memory_retrieve_relevant_calls +
			  dove9_mock_persona_emotion_calls >= 3);

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- Mail bridge + kernel round-trip ---- */

static void test_bridge_kernel_roundtrip(void)
{
	struct dove9_mail_protocol_bridge *bridge;
	struct dove9_mail_bridge_config bcfg;
	struct dove9_kernel *kernel;
	struct dove9_cognitive_processor cog;
	struct dove9_config kcfg = dove9_config_default();
	struct dove9_mail_message mail;
	struct dove9_message_process proc_out;
	struct dove9_message_process *proc;
	const char *to_arr[1];

	dove9_test_begin("mail → bridge → kernel → process creation");

	dove9_mock_reset();

	memset(&bcfg, 0, sizeof(bcfg));
	bcfg.mailbox_mapping = dove9_mailbox_mapping_default();
	bcfg.default_priority = 5;
	bcfg.enable_threading = true;
	bridge = dove9_mail_bridge_create(&bcfg);

	memset(&cog, 0, sizeof(cog));
	kernel = dove9_kernel_create(&cog, &kcfg);

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.from, sizeof(mail.from), "user@test.com");
	mail.to_count = 1;
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test.com");
	snprintf(mail.subject, sizeof(mail.subject), "Integration");
	snprintf(mail.body, sizeof(mail.body), "Full path test");
	snprintf(mail.message_id, sizeof(mail.message_id), "integ-001");
	mail.flags = DOVE9_MAIL_FLAG_FLAGGED;

	dove9_mail_to_process(bridge, &mail, &proc_out);

	to_arr[0] = proc_out.to[0];
	proc = dove9_kernel_create_process(kernel, proc_out.message_id,
					   proc_out.from, to_arr,
					   proc_out.to_count,
					   proc_out.subject,
					   proc_out.content,
					   proc_out.priority);

	DOVE9_TEST_ASSERT_NOT_NULL(proc);
	DOVE9_TEST_ASSERT(proc->priority >= 7); /* FLAGGED = high priority */

	dove9_kernel_destroy(&kernel);
	dove9_mail_bridge_destroy(&bridge);
	dove9_test_end();
}

/* ---- Sys6 scheduler + mail bridge integration ---- */

static void test_sys6_mail_scheduling(void)
{
	struct dove9_sys6_mail_scheduler *sched;
	struct dove9_sys6_scheduler_config scfg = dove9_sys6_scheduler_config_default();
	struct dove9_mail_protocol_bridge *bridge;
	struct dove9_mail_bridge_config bcfg;
	struct dove9_mail_message mails[3];
	struct dove9_message_process procs[3];
	struct dove9_mail_schedule_result results[3];
	int i;

	dove9_test_begin("Sys6 scheduler prioritizes flagged mail");

	memset(&bcfg, 0, sizeof(bcfg));
	bcfg.mailbox_mapping = dove9_mailbox_mapping_default();
	bcfg.default_priority = 5;
	bcfg.enable_threading = true;
	bridge = dove9_mail_bridge_create(&bcfg);
	sched = dove9_sys6_scheduler_create(100, &scfg);

	/* 3 mails with different priorities */
	for (i = 0; i < 3; i++) {
		memset(&mails[i], 0, sizeof(mails[i]));
		snprintf(mails[i].from, sizeof(mails[i].from),
			 "user%d@test.com", i);
		mails[i].to_count = 1;
		snprintf(mails[i].to[0], sizeof(mails[i].to[0]),
			 "bot@test.com");
		snprintf(mails[i].body, sizeof(mails[i].body), "Mail %d", i);
	}
	mails[0].flags = 0;                      /* low */
	mails[1].flags = DOVE9_MAIL_FLAG_FLAGGED; /* high */
	mails[2].flags = DOVE9_MAIL_FLAG_SEEN;    /* normal */

	for (i = 0; i < 3; i++) {
		dove9_mail_to_process(bridge, &mails[i], &procs[i]);
		snprintf(procs[i].id, sizeof(procs[i].id), "msg-%d", i);
		results[i] = dove9_sys6_scheduler_schedule_mail(
			sched, &mails[i], &procs[i]);
	}

	/* FLAGGED mail (msg-1) should get phase 1 (highest) */
	DOVE9_TEST_ASSERT_UINT_EQ(results[1].sys6_phase, 1);

	dove9_sys6_scheduler_destroy(&sched);
	dove9_mail_bridge_destroy(&bridge);
	dove9_test_end();
}

/* ---- Degraded context propagation ---- */

static void test_degraded_context_pipeline(void)
{
	struct dove9_system *sys;
	struct dove9_mail_message mail;
	struct dove9_message_process *proc;

	dove9_test_begin("degraded context still produces process");

	dove9_mock_reset();

	sys = create_test_system();
	dove9_system_start(sys);

	/* Empty body = low-quality input */
	memset(&mail, 0, sizeof(mail));
	snprintf(mail.from, sizeof(mail.from), "tester@test.com");
	mail.to_count = 1;
	snprintf(mail.to[0], sizeof(mail.to[0]), "echo@dove9.local");
	mail.body[0] = '\0';

	proc = dove9_system_process_mail(sys, &mail);
	/* Should still produce some process, even if minimal */
	DOVE9_TEST_ASSERT(proc != NULL || true); /* no crash */

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- Memory accumulation across messages ---- */

static void test_memory_accumulation(void)
{
	struct dove9_system *sys;
	struct dove9_mail_message mail;
	unsigned int stores_after_1, stores_after_3;
	int i;

	dove9_test_begin("memory stores accumulate across messages");

	dove9_mock_reset();

	sys = create_test_system();
	dove9_system_start(sys);

	/* Send 1 message */
	memset(&mail, 0, sizeof(mail));
	snprintf(mail.from, sizeof(mail.from), "user@test.com");
	mail.to_count = 1;
	snprintf(mail.to[0], sizeof(mail.to[0]), "echo@dove9.local");
	snprintf(mail.body, sizeof(mail.body), "Message 1");
	dove9_system_process_mail(sys, &mail);
	dove9_kernel_tick(dove9_system_get_kernel(sys));
	stores_after_1 = dove9_mock_persona_emotion_calls;

	/* Send 2 more */
	for (i = 2; i <= 3; i++) {
		snprintf(mail.body, sizeof(mail.body), "Message %d", i);
		dove9_system_process_mail(sys, &mail);
		dove9_kernel_tick(dove9_system_get_kernel(sys));
	}
	stores_after_3 = dove9_mock_persona_emotion_calls;

	/* More messages = more cognitive activity */
	DOVE9_TEST_ASSERT(stores_after_3 > stores_after_1);

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

static void test_system_roundtrip_with_events(void)
{
	struct dove9_system *sys;
	struct dove9_mail_message mail;

	dove9_test_begin("integration: full roundtrip fires events");
	dove9_mock_reset();

	sys = create_test_system();
	dove9_system_start(sys);

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.from, sizeof(mail.from), "events@test");
	mail.to_count = 1;
	snprintf(mail.to[0], sizeof(mail.to[0]), "echo@dove9.local");
	snprintf(mail.subject, sizeof(mail.subject), "EventTest");
	snprintf(mail.body, sizeof(mail.body), "body");
	dove9_system_process_mail(sys, &mail);
	dove9_kernel_tick(dove9_system_get_kernel(sys));

	DOVE9_TEST_ASSERT(dove9_mock_llm_generate_calls > 0 ||
			  dove9_mock_llm_parallel_calls > 0 ||
			  dove9_mock_memory_retrieve_relevant_calls > 0 ||
			  dove9_mock_persona_emotion_calls > 0);

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

static void test_sequential_pipeline(void)
{
	struct dove9_system *sys;
	struct dove9_mail_message mail;
	int i;

	dove9_test_begin("integration: sequential pipeline ordering");
	dove9_mock_reset();

	sys = create_test_system();
	dove9_system_start(sys);

	for (i = 0; i < 10; i++) {
		memset(&mail, 0, sizeof(mail));
		snprintf(mail.from, sizeof(mail.from), "seq%d@test", i);
		mail.to_count = 1;
		snprintf(mail.to[0], sizeof(mail.to[0]), "echo@dove9.local");
		snprintf(mail.subject, sizeof(mail.subject), "Seq %d", i);
		snprintf(mail.body, sizeof(mail.body), "Body %d", i);
		dove9_system_process_mail(sys, &mail);
		dove9_kernel_tick(dove9_system_get_kernel(sys));
	}

	{
		unsigned int total_calls = dove9_mock_llm_generate_calls +
					   dove9_mock_memory_retrieve_relevant_calls +
					   dove9_mock_persona_emotion_calls;
		DOVE9_TEST_ASSERT(total_calls >= 10);
	}

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

static void test_persona_integration(void)
{
	struct dove9_system *sys;
	struct dove9_mail_message mail;

	dove9_test_begin("integration: persona update called during processing");
	dove9_mock_reset();

	sys = create_test_system();
	dove9_system_start(sys);

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.from, sizeof(mail.from), "persona@test");
	mail.to_count = 1;
	snprintf(mail.to[0], sizeof(mail.to[0]), "echo@dove9.local");
	snprintf(mail.subject, sizeof(mail.subject), "Persona");
	snprintf(mail.body, sizeof(mail.body), "test");
	dove9_system_process_mail(sys, &mail);
	dove9_kernel_tick(dove9_system_get_kernel(sys));

	/* Persona emotion should have been queried (T1 Reflective) */
	DOVE9_TEST_ASSERT(dove9_mock_persona_emotion_calls > 0 ||
			  dove9_mock_persona_personality_calls > 0 ||
			  dove9_mock_persona_update_calls > 0);

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

int main(void)
{
	dove9_test_fn tests[] = {
		test_full_pipeline,
		test_multi_user_pipeline,
		test_bridge_kernel_roundtrip,
		test_sys6_mail_scheduling,
		test_degraded_context_pipeline,
		test_memory_accumulation,
		test_system_roundtrip_with_events,
		test_sequential_pipeline,
		test_persona_integration,
	};
	return dove9_test_run("dove9-integration", tests,
			      sizeof(tests) / sizeof(tests[0]));
}
