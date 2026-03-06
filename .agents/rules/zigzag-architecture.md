---
trigger: always_on
---

# Rule: ZigZag Engineering Standards

## 1. Context & Objectives

All code generated for **Project ZigZag** must adhere to the principle of "Contextual Awareness." The system maps Coordinates $\rightarrow$ Time $\rightarrow$ Metadata.

## 2. Frontend Standards (React Native & Expo)

- **Location Management:** Use `expo-location` for foreground/background tracking. High accuracy is prioritized during "Active Sessions."
- **State Logic:** Implement a "Current Place" provider. Components should react to geofence transitions ($Entering \rightarrow$ $Inside \rightarrow$ $Exiting$).
- **Performance:** Avoid unnecessary re-renders during coordinate updates. Use a throttle/debounce strategy for distance calculations.
- **UI/UX:** Use a "Timeline-first" approach. Activities must be displayed chronologically, with the "Active" task highlighted based on the user's GPS position.

## 3. Backend Standards (NestJS)

- **Modular Architecture:** Separate concerns into `Places`, `Tasks`, `Activities`, and `Geofencing` modules.
- **DTO Validation:** Every incoming coordinate or metadata update must be strictly typed using `class-validator`.
- **Geospatial Logic:** Use PostGIS or standard Haversine formulas for distance validation.
- **Event-Driven:** Use NestJS `EventEmitter` or WebSockets to push metadata to the device when a coordinate match is confirmed.

## 4. AI & Data Layer (LangChain)

- **Metadata Enrichment:** Use LangChain to parse raw metadata into human-readable instructions.
- **Chains:** Implement `LLMChain` for summarizing task logs and `RetrievalQA` if searching through a "Place" knowledge base.
- **Prompts:** Always include the "User Context" (Current Location + Time) in the system message to ensure the AI doesn't suggest out-of-bounds actions.

## 5. Security & Privacy

- **Location Privacy:** GPS data must only be processed when an "Activity" is active.
- **Data Minimization:** Only send the metadata relevant to the _current_ or _next_ chronological point to the device.

---

### How to use this rule

Whenever you ask the agent to "Create a new service for X" or "Build a screen for Y," it will now check these standards to make sure the code matches the **ZigZag** philosophy.

**Would you like me to generate the initial NestJS boilerplate for the `Geofencing` module following these rules?**
