# Subscription

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** September 2026

---

# 1. Purpose

A Subscription is what a teacher pays for. Students never pay — the student side
is free permanently, which is not charity but the acquisition channel: students
are how teachers arrive.

---

# 2. Responsibilities

The Subscription entity is responsible for:

- holding the teacher's current tier and status;
- carrying the billing period boundaries;
- linking the account to the payment provider.

It does not decide what a teacher may do. Entitlement is derived from status:
a subscription that is not paid removes the ability to issue new assignments and
to see analytics, and does nothing at all to the students.

---

# 3. Relationships

- exactly one Subscription per User (unique `userId`);
- many UsageSnapshots, one per calendar month.

---

# 4. Tiers and status

| Tier | Meaning |
|------|---------|
| TIER_10 | Up to ten active students |
| TIER_30 | Up to thirty |
| UNLIMITED | No ceiling |

Steps rather than per-student billing — decision 19. A teacher knows the amount
in advance, and unpredictability unsettles people more than the price does.

| Status | Meaning |
|--------|---------|
| TRIALING | No card taken. Runs until the teacher adds a fourth student |
| ACTIVE | Paid, current |
| PAST_DUE | Payment failed; assignments and analytics are suspended, students unaffected |
| CANCELED | Ended by the teacher |

---

# 5. Two rules that are product decisions, not billing details

## 5.1 Exceeding a tier mid-month changes nothing immediately

Decision 20. The lesson finishes, the eleventh student gets their homework, and
the difference is charged from the next cycle with a notification. Blocking mid
month would leave a student without work and make the product look like the
guilty party.

## 5.2 Non-payment never punishes a student

Students keep taking tests, reading materials and seeing their own statistics
for as long as they have an account. The teacher loses new assignments and
analytics; the archive stays readable. Punishing children for an adult's lapsed
card is the fastest way to lose a reputation that took a year to build.

---

# 6. UsageSnapshot

An "active student" is one who was **set at least one assignment that calendar
month** — decision 03. Not everyone in the groups: a teacher would otherwise pay
for people who vanished in September, and would read that as a swindle.

The number is derivable from assignments, but the snapshot is stored anyway:

| Field | Notes |
|-------|-------|
| userId | The teacher |
| periodStart | First day of the month covered |
| activeStudents | The count that was billed |
| tierAtSnapshot | The tier in force at the time |

Without it a teacher cannot check what they were charged for, and an argument
about an invoice costs more than a table.

---

# 7. Still open

Concrete prices are not fixed. The working anchor is 300–500 UAH per month,
pitched as *less than one lesson*, but the number has to come out of a
conversation with teachers rather than a spreadsheet. See
[`docs/00-overview/teacher-side-decisions.md`](../00-overview/teacher-side-decisions.md) §10.
