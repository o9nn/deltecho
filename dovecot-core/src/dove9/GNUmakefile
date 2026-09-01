# GNUmakefile — standalone build for dove9 cognitive layer (no autotools)
# Usage: make -j4 && make check

CC      ?= gcc
CFLAGS  := -std=c11 -Wall -Wextra -Wno-unused-parameter -O2
LDFLAGS :=
LIBS    := -lm

SRCDIR  := .
INCFLAGS := -I$(SRCDIR)/types -I$(SRCDIR)/utils -I$(SRCDIR)/cognitive \
            -I$(SRCDIR)/core -I$(SRCDIR)/integration -I$(SRCDIR) -I$(SRCDIR)/test

# ---- Library sources ----

LIB_SRCS := \
	utils/dove9-logger.c \
	cognitive/dove9-triadic-engine.c \
	cognitive/dove9-dte-processor.c \
	integration/dove9-mail-protocol-bridge.c \
	core/dove9-kernel.c \
	integration/dove9-orchestrator-bridge.c \
	integration/dove9-sys6-mail-scheduler.c \
	integration/dove9-sys6-orchestrator-bridge.c \
	dove9-system.c

LIB_OBJS := $(LIB_SRCS:.c=.o)

# ---- Test framework ----

TEST_COMMON_SRCS := test/dove9-test-common.c
TEST_MOCK_SRCS   := test/dove9-test-mocks.c
TEST_COMMON_OBJS := $(TEST_COMMON_SRCS:.c=.o)
TEST_MOCK_OBJS   := $(TEST_MOCK_SRCS:.c=.o)

# ---- Test programs ----
# Tests that need only TEST_COMMON
TESTS_COMMON_ONLY := \
	test-dove9-types \
	test-dove9-logger \
	test-dove9-mail-bridge \
	test-dove9-sys6-scheduler \
	test-dove9-sys6-correctness \
	test-dove9-cognitive-context \
	test-dove9-triadic-math \
	test-dove9-coupling-detection \
	test-dove9-mail-protocol \
	test-dove9-salience-landscape \
	test-dove9-step-assignment

# Tests that need TEST_COMMON + TEST_MOCK
TESTS_WITH_MOCKS := \
	test-dove9-triadic-engine \
	test-dove9-dte-processor \
	test-dove9-kernel \
	test-dove9-orchestrator-bridge \
	test-dove9-sys6-bridge \
	test-dove9-system \
	test-dove9-security \
	test-dove9-integration \
	test-dove9-stress \
	test-dove9-kernel-mail \
	test-dove9-event-callbacks \
	test-dove9-system-config \
	test-dove9-memory-lifecycle \
	test-dove9-api-boundary \
	test-dove9-process-management \
	test-dove9-cognitive-pipeline

ALL_TESTS := $(TESTS_COMMON_ONLY) $(TESTS_WITH_MOCKS)

# Suffix .exe on Windows
EXE := .exe

.PHONY: all check check-local coverage clean-coverage clean

all: libdove9.a $(addsuffix $(EXE),$(ALL_TESTS))

# ---- Static library ----

libdove9.a: $(LIB_OBJS)
	$(AR) rcs $@ $^

# ---- Compile rules ----

%.o: %.c
	$(CC) $(CFLAGS) $(INCFLAGS) -c -o $@ $<

# ---- Test link rules ----

define TEST_COMMON_RULE
$(1)$(EXE): test/$(1).o $(TEST_COMMON_OBJS) libdove9.a
	$(CC) $(LDFLAGS) -o $$@ $$^ $(LIBS)
endef

define TEST_MOCK_RULE
$(1)$(EXE): test/$(1).o $(TEST_COMMON_OBJS) $(TEST_MOCK_OBJS) libdove9.a
	$(CC) $(LDFLAGS) -o $$@ $$^ $(LIBS)
endef

$(foreach t,$(TESTS_COMMON_ONLY),$(eval $(call TEST_COMMON_RULE,$(t))))
$(foreach t,$(TESTS_WITH_MOCKS),$(eval $(call TEST_MOCK_RULE,$(t))))

# ---- Check target: run all tests ----

check: all
	@passed=0; failed=0; total=0; \
	for t in $(ALL_TESTS); do \
		total=$$((total + 1)); \
		echo "Running $$t ..."; \
		if ./$$t$(EXE); then \
			echo "PASS: $$t"; \
			passed=$$((passed + 1)); \
		else \
			echo "FAIL: $$t (exit $$?)"; \
			failed=$$((failed + 1)); \
		fi; \
	done; \
	echo ""; \
	echo "=== Results: $$passed/$$total passed, $$failed failed ==="; \
	if [ $$failed -gt 0 ]; then exit 1; fi

# ---- check-local: alias for check (matches Makefile.am target) ----

check-local: check

# ---- Coverage target (matches Makefile.am / CI expectation) ----

COVERAGE_DIR ?= ../../coverage/dove9

coverage: check
	@if command -v lcov >/dev/null 2>&1; then \
		lcov --capture --directory . --output-file dove9-coverage.info; \
		genhtml dove9-coverage.info --output-directory $(COVERAGE_DIR); \
		echo "Coverage report: $(COVERAGE_DIR)/index.html"; \
	else \
		echo "Warning: lcov not found, skipping coverage report"; \
	fi

clean-coverage:
	-rm -f *.gcda *.gcno dove9-coverage.info
	-rm -rf $(COVERAGE_DIR)

clean:
	rm -f $(LIB_OBJS) $(TEST_COMMON_OBJS) $(TEST_MOCK_OBJS) libdove9.a
	rm -f test/*.o
	rm -f $(addsuffix $(EXE),$(ALL_TESTS))
