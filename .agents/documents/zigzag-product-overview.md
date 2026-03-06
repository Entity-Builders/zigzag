Perfect. Keeping the documentation in English is a smart move; it ensures better compatibility with most LLMs and standardized developer workflows.

Here is the professional Product & Business document for your `.agent` folder. I recommend saving this as `.agent/documents/product_vision.md`.

---

# Product Strategy Document: Project ZigZag

## 1. Executive Summary

**ZigZag** is an intelligent logistics and operational management platform that synchronizes real-time physical location with chronological workflows. It transforms static "to-do lists" into a dynamic, context-aware engine that unlocks specific tasks and metadata only when a device intersects predefined geographic and temporal boundaries.

## 2. Core Value Proposition

- **Geospatial Intelligence:** Automated recognition of "Places" via high-precision geofencing.
- **Chronological Orchestration:** Tasks are not just located in space, but ordered in time, ensuring logical workflow progression.
- **Metadata Triggering:** Automatic delivery of context-specific data (manuals, codes, contact info) the moment a user enters a site.
- **Operational Focus:** Eliminates information overload by surfacing only what is relevant to the user's current "Here and Now."

## 3. Technical Ecosystem

- **Client (Mobile):** **React Native & Expo**. Responsible for background location tracking, geofence triggers, and rich-push notification delivery.
- **Core API (Backend):** **NestJS**. Manages the source of truth, relational data between users/groups, and the validation logic for time-windows.
- **Intelligence Layer:** **LangChain**. Utilized for processing complex metadata, generating natural language summaries of tasks, and optimizing chronological routing based on intent.

## 4. Key Domain Entities

| Entity            | Description                                                            |
| ----------------- | ---------------------------------------------------------------------- |
| **Place**         | A geographic coordinate ($lat, lng$) with a defined radius (Geofence). |
| **Task**          | A specific unit of work to be performed within a Place.                |
| **Activity**      | A chronological collection of Tasks assigned to a User or Group.       |
| **Metadata**      | The contextual "payload" (JSON/Text) that unlocks upon arrival.        |
| **Event Horizon** | The specific time-window where a Place becomes "Active."               |

## 5. Functional Logic for the Agent

When assisting with ZigZag, the agent must prioritize:

1. **State Consistency:** Ensuring the mobile device's coordinates match the backend's expected sequence.
2. **Notification Accuracy:** Logic must prevent "notification spam" by validating both location AND time before firing metadata alerts.
3. **Scalability:** Structuring "Groups of Places" so they can be reused across different Activity templates.

---
