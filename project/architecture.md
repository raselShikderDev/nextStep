**1. User request flow**  
- Browser (or external client) sends an HTTP request to the API entry point (`src/routes/mainRoutes.ts`).  
- The request is routed to the appropriate module route (e.g., `src/module/auth/auth.route.ts`, `src/module/user/user.route.ts`).  
- The route handler calls the corresponding controller (`src/module/auth/auth.controller.ts`, `src/module/user/user.controller.ts`).  
- Controllers delegate to services (`src/module/auth/auth.service.ts`, `src/module/user/user.service.ts`, `src/module/payment/payment.service.ts`, etc.).  

**2. Frontend → API flow**  
- No frontend files are present in this repo; any UI would call the HTTP endpoints exposed by the server.  

**3. API → service/business logic flow**  
- Controllers invoke service methods (e.g., `auth.service.ts` → `login`, `register`).  
- Services contain the core business logic and orchestrate calls to Prisma client (`@prisma/client`).  

**4. Service → database flow**  
- Services use the generated Prisma client (`prisma/client`) to read/write the PostgreSQL database.  
- Schema and models are defined in `prisma/schema.prisma` and related files (`prisma/user.prisma`, `prisma/payment.prisma`, etc.).  

**5. Authentication flow**  
- Auth routes (`src/module/auth/auth.route.ts`) use JWT strategy.  
- `auth.service.ts` creates and verifies JWTs (`jsonwebtoken`).  
- `auth.controller.ts` returns the token to the client.  

**6. Authorization flow**  
- Middleware (`src/middleware/*` – not listed but likely used) checks the JWT attached to the request.  
- If valid, the request proceeds to the protected controller; otherwise, a 401/403 response is sent.  

**7. Important business logic**  
- Payment processing (`src/module/payment/payment.service.ts`, `payment.controller.ts`) handles transaction creation, status updates, and integration with external payment gateways.  
- Document handling (`src/module/document/document.service.ts`) manages file uploads and storage.  

**8. Major dependencies between modules**  
- `auth` depends on `user` (user registration/login).  
- `payment` depends on `user` (charged user) and may reference `service` for subscription logic.  
- `requests` service (`src/module/requests/requests.service.ts`) likely ties together user actions and payment events.  
- All modules share the same Prisma schema, ensuring consistent data models.  

**Architecture diagram (text)**  
```
[Client] --> (HTTP) --> [mainRoutes] --> [Controller] --> [Service] --> [Prisma Client] --> [PostgreSQL]
          |                               |
          |                               +--> [Auth Service] --> JWT generation/validation
          |                               +--> [Payment Service] --> transaction logic
          |                               +--> [Document Service] --> file handling
          +--> Middleware (JWT) --> Authorization checks
```

**Key files to explore next**  
- `src/server.ts` / `src/app.ts` – server bootstrap.  
- `src/routes/mainRoutes.ts` – central route aggregation.  
- `src/module/*/service.ts` – business logic.  
- `src/module/*/controller.ts` – request handling.  
- `prisma/schema.prisma` – database schema.  
- `src/module/auth/*` – authentication implementation.