# Security Specification for DR.Pathao

## Data Invariants
1. **Relational Integrity**:
    - An Appointment cannot exist without a valid `doctorId` pointing to an existing doctor in `/doctors/`.
    - A LabBooking must point to a valid `testId` in `/lab_tests/`.
    - A NursingBooking must point to a valid `nurseId` in `/nurses/`.
    - Sub-collections in `/users/{userId}/...` must strictly belong to the user identified by `userId`.
2. **Identity Integrity**:
    - `id` and `userId` fields must be immutable after creation.
    - The `role` field in `/users/{userId}` can only be set during creation and only changed by an admin.
    - `isVerified` status for providers must only be manageable by admins.
3. **Strict Validation**:
    - All strings must have maximum length enforcements (e.g., names <= 100, bios <= 1000).
    - Status fields must follow strict enum state transitions.
4. **Temporal Integrity**:
    - `createdAt` must match `request.time` exactly.
    - `updatedAt` must be updated to `request.time` on every modify.

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Patient A tries to create a user profile in `/users/PatientB`.
2. **Privilege Escalation**: Patient A tries to set `role: 'admin'` on their own profile during creation.
3. **Provider Spoofing**: Patient A tries to set `providerInfo.isVerified: true` on their own profile.
4. **ID Poisoning**: Attempt to create a reminder with an ID like `../../../etc/passwd` or a 10KB junk string.
5. **Ghost Appointment**: Attempt to book an appointment with `userId: 'SomeOtherUID'`.
6. **Orphaned Booking**: Attempt to book a Lab Test using a random `testId` that doesn't exist in `/lab_tests/`.
7. **Immutable Field Attack**: Attempt to change `doctorId` on an existing appointment to move it to another doctor.
8. **Size Exhaustion**: Attempt to write a 1MB string into a reminder `notes` field.
9. **State Shortcut**: Patient tries to set booking status to `completed` directly.
10. **Query Scraper**: Unauthenticated user tries to list all `prescriptions` using a blanket query.
11. **PII Leak**: Non-admin user tries to read another user's private address via `getUsers`.
12. **Shadow Field Attack**: Attempt to update a user profile with an unauthorized field `internalRating: 10`.

## The Test Plan
The `firestore.rules.test.ts` will verify these payloads.

### Role Table
| Collection | Patient Read | Patient Write | Provider Read | Provider Write | Admin |
|------------|--------------|---------------|---------------|----------------|-------|
| Users | Self Only | Create/Edit Self | Self/Search | Create/Edit Self | Full |
| Doctors | Global | Denied | Global | Denied | Full |
| Reminders | Owner | Owner | Denied | Denied | Admin |
| Appointments| Owner | Owner (Create) | Assigned (List/Status) | Status Only | Full |
| Medicines | Global | Denied | Global | Denied | Full |
| Prescriptions| Owner | Owner (Create) | Denied | Denied | Full |
| Lab Tests | Global | Denied | Global | Denied | Full |
| Booking | Owner | Owner (Create) | Denied | Denied | Full |
