# Security Specification - Skin Tight

## Data Invariants
1. A user's profile and data (scans, history, doctor info) MUST only be accessible (read/write) by that specific authenticated user.
2. Usernames must be unique across the platform.
3. Timestamps on creation should match the server time.
4. Core identity fields like `email` or `uid` mapping should not be changeable by the user after creation.

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create/update a user document under a different UID.
   - Target: `setDoc(doc(db, "users", "OTHER_UID"), { ... })`
   - Expect: `PERMISSION_DENIED`

2. **Public Data Scraping**: Attempt to list all users.
   - Target: `getDocs(collection(db, "users"))`
   - Expect: `PERMISSION_DENIED`

3. **Orphaned Writes**: Attempt to create a scan for a user that isn't the logged-in user.
   - Target: `addDoc(collection(db, "users", "OTHER_UID", "scans"), { ... })`
   - Expect: `PERMISSION_DENIED`

4. **Shadow Updates**: Attempt to inject a field like `isAdmin: true` into a user profile.
   - Target: `updateDoc(doc(db, "users", MY_UID), { isAdmin: true })`
   - Expect: `PERMISSION_DENIED` (if schema is strict)

5. **Privilege Escalation**: User A trying to edit User B's doctor info.
   - Target: `setDoc(doc(db, "users", "USER_B_UID", "doctorInfo", "current"), { ... })`
   - Expect: `PERMISSION_DENIED`

6. **Unauthorized Username Claim**: Attempt to set a username mapping for someone else's UID.
   - Target: `setDoc(doc(db, "usernames", "cool_guy"), { uid: "OTHER_UID" })`
   - Expect: `PERMISSION_DENIED`

7. **Bypassing Uniqueness**: Attempt to update a username mapping to point to a different UID.
   - Target: `updateDoc(doc(db, "usernames", "existing_user"), { uid: "MY_UID" })`
   - Expect: `PERMISSION_DENIED`

8. **State Tampering**: Changing the `createdAt` timestamp manually on update.
   - Target: `updateDoc(doc(db, "users", MY_UID), { createdAt: [Some old date] })`
   - Expect: `PERMISSION_DENIED` (if immutable)

9. **Data Poisoning (IDs)**: Creating a scan with a document ID that is 1MB of junk.
   - Target: `setDoc(doc(db, "users", MY_UID, "scans", "JUNK_ID_LONG_STRING..."), { ... })`
   - Expect: `PERMISSION_DENIED` (due to `isValidId`)

10. **Resource Exhaustion**: Sending extremely large strings in the `note` or `fullName` fields.
    - Target: `updateDoc(doc(db, "users", MY_UID), { fullName: [10MB string] })`
    - Expect: `PERMISSION_DENIED` (due to size constraints)

11. **Guest Read Probing**: A guest (unauthenticated) trying to read a user's scan.
    - Target: `getDoc(doc(db, "users", "ANY_UID", "scans", "ANY_ID"))`
    - Expect: `PERMISSION_DENIED`

12. **Malicious Score Injection**: Creating a score history with impossible values (e.g., negative score).
    - Target: `setDoc(doc(db, "users", MY_UID, "timeline", "scores"), { history: [{ score: -500 }] })`
    - Expect: `PERMISSION_DENIED` (if validation checks bounds)
