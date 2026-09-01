/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Tests for dove9_kernel mail protocol integration APIs */

#include "dove9-test-common.h"
#include "dove9-test-mocks.h"
#include "../core/dove9-kernel.h"
#include <string.h>

/* ---- helpers ---- */

static struct dove9_config test_config(void)
{
	struct dove9_config c = dove9_config_default();
	c.max_concurrent_processes = 16;
	c.max_queue_depth = 32;
	return c;
}

static struct dove9_mail_message test_mail(const char *id,
					   const char *from,
					   const char *subject)
{
	struct dove9_mail_message m;
	memset(&m, 0, sizeof(m));
	snprintf(m.message_id, sizeof(m.message_id), "%s", id);
	snprintf(m.from, sizeof(m.from), "%s", from);
	snprintf(m.subject, sizeof(m.subject), "%s", subject);
	snprintf(m.body, sizeof(m.body), "body for %s", id);
	m.to_count = 1;
	snprintf(m.to[0], sizeof(m.to[0]), "bot@test.local");
	m.timestamp = 1700000000;
	m.received_at = 1700000001;
	return m;
}

/* ---- test: enable_mail_protocol ---- */

static void test_enable_mail_protocol(void)
{
	dove9_test_begin("kernel: enable mail protocol");
	dove9_mock_reset();

	struct dove9_config cfg = test_config();
	struct dove9_cognitive_processor cp = dove9_dte_processor_as_cognitive(NULL);
	/* NULL proc is fine — we just test the kernel shell */
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(k);

	DOVE9_TEST_ASSERT(!dove9_kernel_is_mail_protocol_enabled(k));

	struct dove9_mailbox_mapping mb = dove9_mailbox_mapping_default();
	dove9_kernel_enable_mail_protocol(k, &mb);

	DOVE9_TEST_ASSERT(dove9_kernel_is_mail_protocol_enabled(k));

	dove9_kernel_destroy(&k);
	DOVE9_TEST_ASSERT_NULL(k);
	dove9_test_end();
}

/* ---- test: create_process_from_mail ---- */

static void test_create_process_from_mail(void)
{
	dove9_test_begin("kernel: create process from mail");
	dove9_mock_reset();

	struct dove9_config cfg = test_config();
	struct dove9_cognitive_processor cp = dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(k);

	struct dove9_mailbox_mapping mb = dove9_mailbox_mapping_default();
	dove9_kernel_enable_mail_protocol(k, &mb);
	dove9_kernel_start(k);

	struct dove9_mail_message mail = test_mail("msg-1@test", "alice@test", "Hello");
	struct dove9_message_process *proc =
		dove9_kernel_create_process_from_mail(k, &mail);
	DOVE9_TEST_ASSERT_NOT_NULL(proc);
	DOVE9_TEST_ASSERT_STR_EQ(proc->subject, "Hello");

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: get_process_by_message_id ---- */

static void test_get_process_by_message_id(void)
{
	dove9_test_begin("kernel: get process by message_id");
	dove9_mock_reset();

	struct dove9_config cfg = test_config();
	struct dove9_cognitive_processor cp = dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(k);

	struct dove9_mailbox_mapping mb = dove9_mailbox_mapping_default();
	dove9_kernel_enable_mail_protocol(k, &mb);
	dove9_kernel_start(k);

	struct dove9_mail_message mail = test_mail("lookup-1@test", "bob@test", "Lookup");
	dove9_kernel_create_process_from_mail(k, &mail);

	struct dove9_message_process *found =
		dove9_kernel_get_process_by_message_id(k, "lookup-1@test");
	DOVE9_TEST_ASSERT_NOT_NULL(found);
	DOVE9_TEST_ASSERT_STR_EQ(found->subject, "Lookup");

	/* non-existent should return NULL */
	struct dove9_message_process *absent =
		dove9_kernel_get_process_by_message_id(k, "nope@test");
	DOVE9_TEST_ASSERT_NULL(absent);

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: get_message_id_for_process ---- */

static void test_get_message_id_for_process(void)
{
	dove9_test_begin("kernel: get message_id for process");
	dove9_mock_reset();

	struct dove9_config cfg = test_config();
	struct dove9_cognitive_processor cp = dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(k);

	struct dove9_mailbox_mapping mb = dove9_mailbox_mapping_default();
	dove9_kernel_enable_mail_protocol(k, &mb);
	dove9_kernel_start(k);

	struct dove9_mail_message mail = test_mail("rev-1@test", "c@test", "Reverse");
	struct dove9_message_process *proc =
		dove9_kernel_create_process_from_mail(k, &mail);

	const char *mid = dove9_kernel_get_message_id_for_process(k, proc->id);
	DOVE9_TEST_ASSERT_NOT_NULL(mid);
	DOVE9_TEST_ASSERT_STR_EQ(mid, "rev-1@test");

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: move_process_to_mailbox ---- */

static void test_move_process_to_mailbox(void)
{
	dove9_test_begin("kernel: move process to mailbox");
	dove9_mock_reset();

	struct dove9_config cfg = test_config();
	struct dove9_cognitive_processor cp = dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(k);

	struct dove9_mailbox_mapping mb = dove9_mailbox_mapping_default();
	dove9_kernel_enable_mail_protocol(k, &mb);
	dove9_kernel_start(k);

	struct dove9_mail_message mail = test_mail("mv-1@test", "d@test", "Move me");
	struct dove9_message_process *proc =
		dove9_kernel_create_process_from_mail(k, &mail);

	bool moved = dove9_kernel_move_process_to_mailbox(k, proc->id, "Sent");
	DOVE9_TEST_ASSERT(moved);

	const char *mbox = dove9_kernel_get_mailbox_for_process(k, proc->id);
	DOVE9_TEST_ASSERT_NOT_NULL(mbox);
	DOVE9_TEST_ASSERT_STR_EQ(mbox, "Sent");

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: update_process_from_mail_flags ---- */

static void test_update_process_from_mail_flags(void)
{
	dove9_test_begin("kernel: update from mail flags");
	dove9_mock_reset();

	struct dove9_config cfg = test_config();
	struct dove9_cognitive_processor cp = dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(k);

	struct dove9_mailbox_mapping mb = dove9_mailbox_mapping_default();
	dove9_kernel_enable_mail_protocol(k, &mb);
	dove9_kernel_start(k);

	struct dove9_mail_message mail = test_mail("flag-1@test", "e@test", "Flags");
	struct dove9_message_process *proc =
		dove9_kernel_create_process_from_mail(k, &mail);

	unsigned int flags = DOVE9_MAIL_FLAG_SEEN | DOVE9_MAIL_FLAG_ANSWERED;
	bool updated = dove9_kernel_update_process_from_mail_flags(k, proc->id, flags);
	DOVE9_TEST_ASSERT(updated);

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: get_mail_bridge ---- */

static void test_get_mail_bridge(void)
{
	dove9_test_begin("kernel: get mail bridge");
	dove9_mock_reset();

	struct dove9_config cfg = test_config();
	struct dove9_cognitive_processor cp = dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(k);

	/* before enabling mail: bridge may be NULL */
	struct dove9_mail_protocol_bridge *bridge =
		dove9_kernel_get_mail_bridge(k);
	/* implementation-defined: some implementations always create it */

	struct dove9_mailbox_mapping mb = dove9_mailbox_mapping_default();
	dove9_kernel_enable_mail_protocol(k, &mb);

	bridge = dove9_kernel_get_mail_bridge(k);
	DOVE9_TEST_ASSERT_NOT_NULL(bridge);

	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: processes_by_mailbox ---- */

static void test_processes_by_mailbox(void)
{
	dove9_test_begin("kernel: get processes by mailbox");
	dove9_mock_reset();

	struct dove9_config cfg = test_config();
	struct dove9_cognitive_processor cp = dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(k);

	struct dove9_mailbox_mapping mb = dove9_mailbox_mapping_default();
	dove9_kernel_enable_mail_protocol(k, &mb);
	dove9_kernel_start(k);

	/* create two messages destined for different mailboxes */
	struct dove9_mail_message m1 = test_mail("mbox-a@test", "f@test", "A");
	struct dove9_mail_message m2 = test_mail("mbox-b@test", "g@test", "B");
	dove9_kernel_create_process_from_mail(k, &m1);
	struct dove9_message_process *p2 =
		dove9_kernel_create_process_from_mail(k, &m2);

	/* move p2 to Sent */
	dove9_kernel_move_process_to_mailbox(k, p2->id, "Sent");

	struct dove9_message_process *results[16];
	unsigned int n = dove9_kernel_get_processes_by_mailbox(
		k, "Sent", results, 16);
	DOVE9_TEST_ASSERT(n >= 1);

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: all_processes enumeration ---- */

static void test_all_processes(void)
{
	dove9_test_begin("kernel: get all processes");
	dove9_mock_reset();

	struct dove9_config cfg = test_config();
	struct dove9_cognitive_processor cp = dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(k);

	dove9_kernel_start(k);

	const char *tos[] = {"bot@test"};
	dove9_kernel_create_process(k, "all-a", "x@test", tos, 1, "A", "body", 5);
	dove9_kernel_create_process(k, "all-b", "y@test", tos, 1, "B", "body", 3);
	dove9_kernel_create_process(k, "all-c", "z@test", tos, 1, "C", "body", 7);

	struct dove9_message_process *out[16];
	unsigned int n = dove9_kernel_get_all_processes(k, out, 16);
	DOVE9_TEST_ASSERT(n >= 3);

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: active_processes subset ---- */

static void test_active_processes(void)
{
	dove9_test_begin("kernel: get active processes");
	dove9_mock_reset();

	struct dove9_config cfg = test_config();
	struct dove9_cognitive_processor cp = dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(k);

	dove9_kernel_start(k);

	const char *tos[] = {"bot@test"};
	dove9_kernel_create_process(k, "act-1", "a@test", tos, 1, "S", "b", 5);

	struct dove9_message_process *out[16];
	unsigned int n = dove9_kernel_get_active_processes(k, out, 16);
	/* Newly created work is queued as pending until the kernel ticks. */
	DOVE9_TEST_ASSERT_UINT_EQ(n, 0);
	DOVE9_TEST_ASSERT_UINT_EQ(
		dove9_kernel_get_all_processes(k, out, 16), 1);

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- main ---- */

int main(void)
{
	static dove9_test_fn tests[] = {
		test_enable_mail_protocol,
		test_create_process_from_mail,
		test_get_process_by_message_id,
		test_get_message_id_for_process,
		test_move_process_to_mailbox,
		test_update_process_from_mail_flags,
		test_get_mail_bridge,
		test_processes_by_mailbox,
		test_all_processes,
		test_active_processes,
	};
	return dove9_test_run("dove9-kernel-mail",
			      tests,
			      sizeof(tests) / sizeof(tests[0]));
}
