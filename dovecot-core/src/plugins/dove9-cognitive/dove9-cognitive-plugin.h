/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#ifndef DOVE9_COGNITIVE_PLUGIN_H
#define DOVE9_COGNITIVE_PLUGIN_H

/*
 * dove9-cognitive — Dovecot mail plugin
 *
 * Bridges every incoming / saved / expunged mail event through the
 * Dove9 cognitive pipeline:
 *
 *   mail event  ->  dove9_mail_message  ->  dove9_system_process_mail()
 *                                                  ↓
 *                                      triadic engine + kernel + DTE
 *                                                  ↓
 *                              DOVE9_SYS_RESPONSE_READY event
 *                                                  ↓
 *                                  (optional) inject response mail
 *
 * The plugin registers with the "notify" plugin vtable so it receives
 * transactional mail_save / mail_copy / mail_expunge / commit callbacks.
 *
 * Configuration:
 *   plugin {
 *     dove9_cognitive_enabled = yes
 *     dove9_bot_email         = echo@dovecho.local
 *     dove9_milter_socket     = /var/run/dovecho/dove9-milter.sock
 *     dove9_step_duration_ms  = 100
 *     dove9_max_processes     = 64
 *   }
 */

struct module;

extern const char *dove9_cognitive_plugin_version;
extern const char *dove9_cognitive_plugin_dependencies[];

void dove9_cognitive_plugin_init(struct module *module);
void dove9_cognitive_plugin_deinit(void);

#endif /* DOVE9_COGNITIVE_PLUGIN_H */
