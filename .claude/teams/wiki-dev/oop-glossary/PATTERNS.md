# Software Patterns Catalog

## Table of contents

- [Creational](#creational) — Object/instance creation patterns
- [Structural](#structural) — Class/object composition patterns
- [Behavioral](#behavioral) — Communication between objects
- [Architectural](#architectural) — System-level structure
- [Concurrency](#concurrency) — Parallel execution management
- [Enterprise](#enterprise) — Large-scale system integration
- [Functional](#functional) — FP composition and error handling
- [DDD](#ddd) — Domain-driven design patterns

This catalog lists each pattern's **use-when** criteria and **key structure**. Claude already knows the full definitions — this file provides the decision criteria for detection and implementation.

---

## Creational

| Pattern          | Use When                                                                                            | Key Structure                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Singleton        | Single shared resource (config, logger, pool) must be coordinated across the system                 | Private constructor, static `getInstance()`                                             |
| Factory Method   | A class cannot anticipate the type of objects it creates; subclasses specify created objects        | Abstract creator with `createProduct()`; concrete creators override                     |
| Abstract Factory | System must work with multiple families of related products and enforce family consistency          | Abstract factory interface with methods per product type; concrete factories per family |
| Builder          | Object requires many optional parameters; construction process must allow different representations | Builder with step methods, Director orchestrates, `build()` returns product             |
| Prototype        | Object creation is expensive; system must be independent of how products are created                | `clone()` method on prototype; deep copy of existing instance                           |

## Structural

| Pattern   | Use When                                                                                  | Key Structure                                                                               |
| --------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Adapter   | Existing class interface does not match the one you need                                  | Target interface; Adapter wraps Adaptee and translates calls                                |
| Bridge    | Both abstraction and implementation have multiple variants that should combine freely     | Abstraction holds Implementor reference; both vary independently                            |
| Composite | Tree structures where clients treat leaves and containers uniformly                       | Component interface; Leaf and Composite both implement it; Composite holds children         |
| Decorator | Add behavior to individual objects dynamically without affecting others of the same class | Decorator implements same interface as component, wraps and forwards with added behavior    |
| Facade    | Subsystem is complex and clients need a simplified view                                   | Facade delegates to subsystem classes internally                                            |
| Flyweight | Large number of similar objects; memory is a constraint                                   | Shared intrinsic state in flyweight; extrinsic state passed by client; factory manages pool |
| Proxy     | Lazy initialization, access control, logging, or caching around an object                 | Proxy implements same interface as real subject, intercepts calls                           |

## Behavioral

| Pattern                 | Use When                                                                                | Key Structure                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Observer                | Changes in one object must be reflected in others without tight coupling                | Subject maintains observer list; observers implement `update()`; subject calls `notify()` |
| Strategy                | Multiple algorithms for a task; switch between them at runtime                          | Strategy interface; concrete strategies; context holds strategy reference                 |
| Command                 | Decouple request sender from executor; need undo/redo or queuing                        | Command with `execute()`; invoker triggers commands; receiver performs action             |
| State                   | Object behavior depends on internal state and must change at runtime                    | Context delegates to current State object; states implement same interface                |
| Template Method         | Multiple classes share algorithm structure but differ in specific steps                 | Abstract class with final skeleton method calling abstract/hook steps                     |
| Iterator                | Traverse a collection without exposing its internal representation                      | Iterator with `next()`, `hasNext()`; collection provides iterator factory                 |
| Mediator                | Many objects communicate in complex ways; direct references create dependency web       | Mediator coordinates; colleagues reference only the mediator                              |
| Chain of Responsibility | Multiple objects can handle a request; handler not known in advance                     | Handler with `handle()` and next reference; each handler processes or passes              |
| Visitor                 | Many distinct operations on a complex object structure; avoid polluting element classes | Visitor with `visit()` per element type; elements implement `accept(visitor)`             |
| Memento                 | Need undo/redo or state checkpointing                                                   | Originator creates Memento; Caretaker stores without examining contents                   |
| Interpreter             | Simple language or DSL needs evaluation                                                 | Abstract expression with `interpret(context)`; terminal and non-terminal expressions      |

## Architectural

| Pattern            | Use When                                                                                | Key Structure                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| MVC                | Interactive app where UI and business logic vary independently                          | Model (data) + View (presentation) + Controller (input); Controller updates Model, Model notifies View |
| MVP                | Testable presentation layer with passive View                                           | View delegates to Presenter; Presenter updates Model and pushes to View                                |
| MVVM               | Framework with native data-binding (WPF, SwiftUI, Vue, Angular)                         | View binds to ViewModel properties; ViewModel transforms Model; changes propagate automatically        |
| Hexagonal          | App must be testable independently of UI, database, or external services                | Core defines Port interfaces; Adapters implement for specific tech; core never references adapters     |
| Clean Architecture | Long-lived app where business rules must survive tech changes                           | Concentric layers (Entities → Use Cases → Adapters → Frameworks); inner never depends on outer         |
| Event-Driven       | Components need loose coupling, async workflows, or event replay/audit                  | Producers emit events; bus routes; consumers react independently                                       |
| Microservices      | Independent deployment, different tech per service, independent scaling                 | Loosely coupled services, each owns its data, communicate via API/messaging                            |
| Layered            | Clear separation between UI, logic, and persistence                                     | Horizontal layers; each depends only on the layer below                                                |
| CQRS               | Read/write workloads have different scaling or the domain benefits from separate models | Separate command and query models/handlers                                                             |
| Event Sourcing     | Need complete audit trail, temporal queries, or event-driven architecture               | State stored as event sequence; reconstruct by replaying events                                        |

## Concurrency

| Pattern           | Use When                                                 | Key Structure                                                           |
| ----------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| Active Object     | Async method calls without exposing threading to callers | Proxy queues requests; scheduler dispatches on private thread           |
| Monitor           | Multiple threads access shared mutable state             | Synchronized methods + condition variables for wait/signal              |
| Thread Pool       | Many short-lived tasks; thread creation overhead matters | Pool of workers; shared task queue; workers dequeue and execute         |
| Producer-Consumer | Producers and consumers operate at different speeds      | Shared bounded buffer; synchronization on empty/full conditions         |
| Read-Write Lock   | Shared data read frequently, written infrequently        | Separate `readLock()` and `writeLock()`; multiple readers OR one writer |

## Enterprise

| Pattern         | Use When                                                           | Key Structure                                                                   |
| --------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Repository      | Abstract data store behind domain-friendly API                     | Interface with `find()`, `save()`, `remove()`; implementation wraps ORM/queries |
| Unit of Work    | Multiple domain objects must be persisted atomically               | Tracks new/modified/deleted; `commit()` writes all in one transaction           |
| Service Locator | Simple service lookup without full DI framework                    | Registry maps names/types to implementations; `locator.get(ServiceType)`        |
| DTO             | Transfer data across boundaries without exposing domain model      | Plain object with fields, no business logic                                     |
| Gateway         | Isolate external system API behind OO interface                    | Gateway with domain-friendly methods; implementation handles protocol           |
| Message Broker  | Async communication between decoupled services                     | Producers publish to topics; broker routes; consumers subscribe                 |
| Saga            | Distributed transaction across services; 2PC not viable            | Chain of local transactions + compensating actions for rollback                 |
| Circuit Breaker | Calling unreliable external service; need fail-fast during outages | Three states: Closed → Open → Half-Open; tracks failures and timeouts           |

## Functional

| Pattern      | Use When                                                                 | Key Structure                                                                     |
| ------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Monad        | Chain operations that may fail/carry context without nested conditionals | `M<A>` with `of(a)` and `flatMap(f: A -> M<B>)`; identity + associativity laws    |
| Functor      | Transform values inside a container uniformly                            | `map(f: A -> B): F<B>` on custom container types                                  |
| Lens         | Read/update nested immutable data without manual spreading               | `Lens<S,A>` with `get(s)` and `set(a, s)`; lenses compose                         |
| Continuation | Backtracking, coroutines, or custom control flow                         | CPS — functions take extra `k` parameter for "what to do next"                    |
| Trampolining | Deep recursion in language without tail-call optimization                | Return `Thunk(() => nextStep)` instead of direct recursion; loop evaluates thunks |

## DDD

| Pattern               | Use When                                                                  | Key Structure                                                                                 |
| --------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Aggregate             | Group of entities must change atomically; enforce cross-entity invariants | Aggregate Root (only external entry); internal entities + value objects; consistency boundary |
| Entity                | Object tracked across time by identity, not attributes                    | Unique ID; equality based on ID                                                               |
| Value Object          | Concept defined by what it is, not who (Money, Address, DateRange)        | Immutable; equality by all fields; no identity                                                |
| Domain Event          | Other system parts react to domain changes without coupling to source     | Immutable event with timestamp + aggregate ID + data; published after state changes           |
| Bounded Context       | Large domain has subdomains where same terms mean different things        | Each context has own model, own ubiquitous language, explicit integration at boundaries       |
| Anti-Corruption Layer | Integrating with legacy/external system whose model differs from yours    | Facade + Adapter + Translator converting foreign concepts to your domain language             |
