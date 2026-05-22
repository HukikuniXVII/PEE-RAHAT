# Fullstack-Dev Skill — Quick Start Guide for PEERAHAT

**Installation Status:** ✅ Complete  
**Date:** 2569-05-08  
**All Files Installed & Ready to Use**

---

## What You Have Now

The **fullstack-dev skill** is fully installed in your project at:

```
F:\DEV\PEERAHAT\.skill\fullstack-dev\
```

### Files Available

| File | Purpose | Size | Read First? |
|------|---------|------|-------------|
| **SKILL.md** | Main skill guide (1000+ lines) | 35KB | ✅ Yes (then sections as needed) |
| **PEERAHAT-INTEGRATION.md** | How to apply skill to PEERAHAT | 8KB | ✅ Yes (second) |
| **PEERAHAT-CHECKLIST.md** | Implementation TODO list with priorities | 12KB | ✅ Yes (for tracking) |
| **QUICK-START.md** | This file | 3KB | ✅ (you're reading it) |
| **references/api-design.md** | REST API endpoint design patterns | Variable | 📖 As needed |
| **references/auth-flow.md** | JWT, token refresh, RBAC patterns | Variable | 📖 For auth work |
| **references/db-schema.md** | Database schema, migrations, indexes | Variable | 📖 For DB work |
| **references/environment-management.md** | Config, CORS, env vars per env | Variable | 📖 For config work |
| **references/release-checklist.md** | 6-gate release verification | Variable | 📖 Before production |
| **references/testing-strategy.md** | Unit, integration, e2e, contract tests | Variable | 📖 For testing |
| **references/technology-selection.md** | Tech stack selection criteria | Variable | 📖 For architecture decisions |
| **references/django-best-practices.md** | Django/Python patterns | Variable | ⏭️ Skip (not PEERAHAT) |

---

## Reading Order (This Week)

### Tuesday 2569-05-08
1. **SKILL.md** - Read sections in this order:
   - [7 Iron Rules](#) (memorize these)
   - [Section 1: Project Structure](#)
   - [Section 3: Error Handling](#) ← **Start here for Phase 1**

### Wednesday 2569-05-09
2. **PEERAHAT-INTEGRATION.md** - Understand how skill applies to your stack
3. **PEERAHAT-CHECKLIST.md** - Plan implementation (Section 1-3)

### Thursday 2569-05-10+
4. **Focus on Critical Path:**
   - Implement Section 3 (Error Handling)
   - Implement Section 2 (Configuration)
   - Then 1, 6, 7, 13...

---

## Immediate Actions (This Week)

### ✅ DO THIS TODAY

1. **Read the 7 Iron Rules** from SKILL.md:
   ```markdown
   1. ✅ Organize by FEATURE, not by technical layer
   2. ✅ Controllers never contain business logic
   3. ✅ Services never import HTTP request/response types
   4. ✅ All config from env vars, validated at startup, fail fast
   5. ✅ Every error is typed, logged, and returns consistent format
   6. ✅ All input validated at the boundary — trust nothing from client
   7. ✅ Structured JSON logging with request ID — not console.log
   ```

2. **Open PEERAHAT-INTEGRATION.md** in your IDE and bookmark it

3. **Add this to your project README** (or somewhere visible):
   ```markdown
   ## Architecture
   This project follows the fullstack-dev skill from MiniMax-AI.
   - Main reference: [.skill/fullstack-dev/SKILL.md](./.skill/fullstack-dev/SKILL.md)
   - Implementation checklist: [.skill/fullstack-dev/PEERAHAT-CHECKLIST.md](./.skill/fullstack-dev/PEERAHAT-CHECKLIST.md)
   - Integration guide: [.skill/fullstack-dev/PEERAHAT-INTEGRATION.md](./.skill/fullstack-dev/PEERAHAT-INTEGRATION.md)
   ```

### 🔄 START THIS WEEK

4. **Implement Section 3: Error Handling** (3-4 hours)
   - Create typed error classes
   - Add global error handler middleware
   - Update all error throws

5. **Implement Section 2: Configuration** (2-3 hours)
   - Create centralized config file
   - Validate required env vars at startup
   - Create `.env.example`

6. **Implement Section 7: Logging** (3-4 hours)
   - Install Pino or Winston logger
   - Replace all console.log with structured logs
   - Add request ID middleware

---

## How to Use This Skill in Daily Work

### When Adding a New Feature

Follow the **Mandatory Workflow** from [SKILL.md Step 0-5](./SKILL.md#step-0-gather-requirements):

```
Step 0: Gather Requirements (clarify stack, auth, real-time, etc.)
  ↓
Step 1: Architectural Decisions (table of choices)
  ↓
Step 2: Scaffold with Checklist (ensure all items done)
  ↓
Step 3: Implement Following Patterns (use skill sections as reference)
  ↓
Step 4: Test & Verify (build check, smoke test, integration)
  ↓
Step 5: Handoff Summary (what was built, how to run, next steps)
```

### When You're Stuck

1. **Find the problem topic** in [Quick Navigation](./SKILL.md#quick-navigation) table
2. **Jump to that section** (e.g., "How do I handle errors?" → Section 3)
3. **Read the pattern examples** (TypeScript, Python, Go provided)
4. **Apply pattern to your code**
5. **Reference the section in your commit message**

### When Code Reviewing

**Use the 7 Iron Rules as a checklist:**

```
Code Review Checklist:
☐ Business logic is in service layer, not controller
☐ All errors are typed (AppError, NotFoundError, etc.)
☐ Input validation at controller boundary
☐ No console.log in production code
☐ Services don't import HTTP types (req, res)
☐ Config loaded from centralized config file
☐ Structured logging with request ID
```

---

## Key Files to Know

### Backend (NestJS)

| File Path | Purpose | Skill Section |
|-----------|---------|---------------|
| `apps/api/src/app.module.ts` | Main module, middleware order | 6 |
| `apps/api/src/main.ts` | Entry point, app startup | 2, 13 |
| `apps/api/src/config/config.ts` | **Create:** Centralized config | 2 |
| `apps/api/src/common/errors/` | **Create:** Error hierarchy | 3 |
| `apps/api/src/common/middleware/` | Request ID, logging, error handler | 3, 7 |
| `apps/api/src/[feature]/[feature].controller.ts` | Thin controller (parse, validate, call service) | 1 |
| `apps/api/src/[feature]/[feature].service.ts` | Business logic, no HTTP types | 1 |
| `apps/api/src/[feature]/[feature].repository.ts` | Data access only | 1 |
| `apps/api/prisma/schema.prisma` | Database schema | 4 |
| `apps/api/prisma/migrations/` | Schema migrations (never manual SQL) | 4 |

### Frontend (Next.js)

| File Path | Purpose | Skill Section |
|-----------|---------|---------------|
| `apps/web/lib/api-client.ts` | Type-safe fetch wrapper | 5 |
| `apps/web/lib/error-handler.ts` | **Create:** API error → user message | 12 |
| `apps/web/app/layout.tsx` | Auth provider setup | 6 |
| `apps/web/components/` | Never put business logic here | 1 |
| `.env.example` | Document all env vars (no secrets!) | 2 |
| `.env.local` | Local secrets (gitignored) | 2 |

### Shared

| File Path | Purpose | Skill Section |
|-----------|---------|---------------|
| `packages/types/src/api.ts` | API request/response types | 5, 12 |
| `packages/types/src/auth.ts` | User, roles, claims types | 6 |
| `packages/types/src/[feature].ts` | Feature-specific types | All |

---

## Decision Tree for Common Tasks

### "I need to add authentication to an endpoint"

1. **Read:** [SKILL.md Section 6](./SKILL.md#6-authentication--middleware-high)
2. **Add:** `@UseGuards(AuthGuard('jwt'))` to controller method
3. **Inject:** `@CurrentUser() user: User` as parameter
4. **Test:** Verify 401 on missing token, 403 on insufficient roles

### "I need to fetch data from an API endpoint"

1. **Read:** [SKILL.md Section 5](./SKILL.md#5-api-client-patterns-medium)
2. **Use:** `apiClient.get<T>('/path')` from `apps/web/lib/api-client.ts`
3. **Handle error:** Map to user message via error-handler.ts
4. **Done:** Type-safe, no hardcoded URL

### "I need to upload a file"

1. **Read:** [SKILL.md Section 10](./SKILL.md#10-file-upload-patterns-medium)
2. **For large files (> 5MB):** Use presigned URL flow
3. **For small files (< 10MB):** Multipart form is OK
4. **Implement:** See presigned URL pattern examples

### "I need to design a database query"

1. **Read:** [SKILL.md Section 4](./SKILL.md#4-database-access-patterns-high)
2. **Check for N+1:** Use `include: { relations: true }` not loops
3. **Use transactions:** Multi-step writes in `db.$transaction()`
4. **Write migration:** Never manual SQL

### "I need to add error handling"

1. **Read:** [SKILL.md Section 3](./SKILL.md#3-error-handling--resilience-high)
2. **Use typed error:** `throw new NotFoundError('Order', orderId)`
3. **Global handler:** Catches and formats automatically
4. **Frontend:** Maps error code to user message

### "Things are slow or I see duplicate requests"

1. **Read:** [SKILL.md Section 9](./SKILL.md#9-caching-patterns-medium)
2. **Check for N+1:** Review DB queries (Section 4)
3. **Add caching:** Cache-aside pattern for reads (Phase 2+)
4. **Add indexes:** DB schema indices (references/db-schema.md)

---

## Common Patterns at a Glance

### ✅ Service Implementation

```typescript
// apps/api/src/orders/order.service.ts
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly paymentService: PaymentService,
  ) {}

  async createOrder(userId: string, data: CreateOrderInput): Promise<Order> {
    // No HTTP types ever
    // All validation done in controller
    // All business logic here
    return this.orderRepo.create({ userId, ...data });
  }
}
```

### ✅ Controller Implementation

```typescript
// apps/api/src/orders/order.controller.ts
@Controller('orders')
export class OrderController {
  constructor(private readonly service: OrderService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @CurrentUser() user: User,      // From decorator
    @Body() data: CreateOrderDto,   // Validated by DTO
  ) {
    return this.service.createOrder(user.id, data);
    // That's it. No business logic here.
  }
}
```

### ✅ Error Handling

```typescript
// Anywhere in code:
if (!user) {
  throw new NotFoundError('User', userId);  // Typed error
}

// Global handler catches it → returns:
// { title: 'NOT_FOUND', status: 404, detail: 'User not found: user_123', request_id: '...' }
```

### ✅ Logging

```typescript
// Not this:
console.log('Order created for user', user.id);  // ❌

// Do this:
this.logger.info('Order created', { 
  orderId: order.id, 
  userId: user.id, 
  total: order.total,
  items: order.items.length,
});
// Output: {"level":"info","msg":"Order created","orderId":"...","userId":"..."}
```

### ✅ API Client (Frontend)

```typescript
// apps/web/lib/api-client.ts
const orders = await apiClient.get<{ data: Order[] }>('/api/orders');

// Auto-attached auth token ✅
// Auto-refresh on 401 ✅
// Type-safe ✅
// Error throws ApiError (with status code) ✅
```

---

## Reference Quick Links

| Need | Link |
|------|------|
| REST API endpoint design (URLs, status codes, pagination) | [references/api-design.md](./references/api-design.md) |
| JWT, token refresh, Next.js SSR, RBAC, middleware order | [references/auth-flow.md](./references/auth-flow.md) |
| Database schema, migrations, indexes, multi-tenancy | [references/db-schema.md](./references/db-schema.md) |
| CORS config, env vars per environment setup | [references/environment-management.md](./references/environment-management.md) |
| Unit, integration, e2e, contract, performance testing | [references/testing-strategy.md](./references/testing-strategy.md) |
| 6-gate checklist before production launch | [references/release-checklist.md](./references/release-checklist.md) |
| Tech stack selection for different scenarios | [references/technology-selection.md](./references/technology-selection.md) |

---

## GitHub Repository

Original skill source:  
**https://github.com/MiniMax-AI/skills/tree/main/skills/fullstack-dev**

Check there for updates or if you find issues.

---

## FAQ

**Q: Can I modify these skill files?**  
A: Yes. The `.skill/fullstack-dev/` directory is yours. Add notes, update patterns for PEERAHAT-specific needs, etc.

**Q: Do I need to follow EVERY pattern?**  
A: Prioritize by this order:
1. **7 Iron Rules** — mandatory
2. **Sections 1-3, 6-7, 13** — mandatory for Phase 1
3. **Sections 4-5, 10-12** — within scope, do during Phase 1
4. **Sections 8-9, 11** — can defer to Phase 2

**Q: Where do I track my progress?**  
A: **PEERAHAT-CHECKLIST.md** has a progress table. Update status as you go.

**Q: How do I reference the skill in commits?**  
A: Use format:
```
[FR-XXX] <feature>: Section <N> pattern

- One line per change
- References Fullstack-Dev Skill Section <N>
```

**Example:**
```
[FR-TH-02] Add error handling: Section 3

- Created AppError base class
- Defined typed error classes (NotFoundError, ValidationError, etc.)
- Added global error handler middleware
- References Fullstack-Dev Skill Section 3: Error Handling & Resilience
```

---

## Next Steps

1. **Today:** Read SKILL.md Section 1 + 7 Iron Rules
2. **Tomorrow:** Read PEERAHAT-INTEGRATION.md + PEERAHAT-CHECKLIST.md
3. **This week:** Start implementing Section 3 (Error Handling)
4. **This month:** Complete Priority ✅ items in checklist

**Good luck! You've got a solid blueprint now. 🚀**

---

*Fullstack-Dev Skill installed for PEERAHAT on 2569-05-08*

