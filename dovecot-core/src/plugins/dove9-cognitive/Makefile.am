# Dove9 Cognitive Plugin — Makefile.am
#
# Builds lib25_dove9_cognitive_plugin.la — a Dovecot mail-storage
# plugin that bridges every transactional mail event through the
# Dove9 cognitive pipeline (triadic engine → kernel → DTE processor).
#
# Depends on:
#   - notify plugin (mail event hooks)
#   - libdove9.la   (cognitive layer — built in ../dove9/)

AM_CPPFLAGS = \
	-I$(top_srcdir)/src/lib \
	-I$(top_srcdir)/src/lib-settings \
	-I$(top_srcdir)/src/lib-mail \
	-I$(top_srcdir)/src/lib-imap \
	-I$(top_srcdir)/src/lib-index \
	-I$(top_srcdir)/src/lib-storage \
	-I$(top_srcdir)/src/plugins/notify \
	-I$(top_srcdir)/src/dove9 \
	-I$(top_srcdir)/src/dove9/types \
	-I$(top_srcdir)/src/dove9/utils \
	-I$(top_srcdir)/src/dove9/cognitive \
	-I$(top_srcdir)/src/dove9/core \
	-I$(top_srcdir)/src/dove9/integration

NOPLUGIN_LDFLAGS =
lib25_dove9_cognitive_plugin_la_LDFLAGS = -module -avoid-version

module_LTLIBRARIES = lib25_dove9_cognitive_plugin.la

if DOVECOT_PLUGIN_DEPS
notify_deps = ../notify/lib15_notify_plugin.la
dove9_deps  = ../../dove9/libdove9.la
endif

lib25_dove9_cognitive_plugin_la_LIBADD = \
	$(notify_deps) \
	$(dove9_deps) \
	-lm

lib25_dove9_cognitive_plugin_la_SOURCES = \
	dove9-cognitive-plugin.c

headers = \
	dove9-cognitive-plugin.h

pkginc_libdir = $(pkgincludedir)
pkginc_lib_HEADERS = $(headers)
