# Security Specification - Cloud Clipboard

## Data Invariants
1. A clipboard item must belong to a valid authenticated user.
2. Users can only read, write, update, or delete their own items.
3. Storage usage must be tracked and cannot exceed 10MB per user.
4. Images must have a valid storage URL.
5. All timestamps must be server-validated.

## The Dirty Dozen Payloads (Rejection Tests)

1. **Identity Spoofing**: Attempt to create an item with another user's `userId`.
   - Result: `PERMISSION_DENIED` (Rule enforces `incoming().userId == request.auth.uid`).
2. **Anonymous Access**: Attempt to read any collection without authentication.
   - Result: `PERMISSION_DENIED` (Rule requires `request.auth != null`).
3. **Storage Bloat**: Attempt to set `storageUsed` to 100GB.
   - Result: `PERMISSION_DENIED` (Rule enforces `data.storageUsed <= 10485760`).
4. **ID Poisoning**: Attempt to create a document with a 2MB string as ID.
   - Result: `PERMISSION_DENIED` (Rule uses `isValidId()` for path variables).
5. **State Shortcut**: Attempt to update `createdAt` of an existing item.
   - Result: `PERMISSION_DENIED` (Rule enforces `affectedKeys().hasOnly(...)` which excludes `createdAt`).
6. **Shadow Fields**: Attempt to add `isAdmin: true` to a user document.
   - Result: `PERMISSION_DENIED` (Rule enforces `keys().size()` and `hasOnly()`).
7. **Cross-User Leak**: Authenticated User A tries to `get` User B's clipboard item.
   - Result: `PERMISSION_DENIED` (Rule enforces `resource.data.userId == request.auth.uid`).
8. **Malicious Image**: Attempt to save a non-URL string as `imageUrl`.
   - Result: `PERMISSION_DENIED` (Validation helper type checks).
9. **Duplicate ID Injection**: Attempt to create a label with a name that is actually a script.
   - Result: `PERMISSION_DENIED` (Character set validation if applicable, but definitely size and type).
10. **Query Scraping**: Attempting a list query without a filter on `userId`.
    - Result: `PERMISSION_DENIED` (Rules enforce `resource.data.userId == request.auth.uid` on list).
11. **PII Exposure**: Trying to read the `users` collection items of others.
    - Result: `PERMISSION_DENIED` (Isolated by `userId` in path).
12. **Time Spoofing**: Sending a manual `createdAt` string from the client instead of server timestamp.
    - Result: `PERMISSION_DENIED` (Rule requires `incoming().createdAt == request.time`).

## Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }

    // Helpers
    function isSignedIn() { return request.auth != null; }
    function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }
    function isValidId(id) { return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$'); }
    function incoming() { return request.resource.data; }
    function existing() { return resource.data; }

    // User Profile & Storage tracking
    match /users/{userId} {
      function isValidUser(data) {
        return data.userId == userId &&
               data.storageUsed is number &&
               data.storageUsed >= 0 &&
               data.storageUsed <= 10485760 &&
               data.keys().hasAll(['userId', 'storageUsed', 'updatedAt']) &&
               data.keys().size() <= 4;
      }
      allow get: if isOwner(userId);
      allow create: if isOwner(userId) && isValidUser(incoming());
      allow update: if isOwner(userId) && isValidUser(incoming()) &&
                    incoming().diff(existing()).affectedKeys().hasOnly(['storageUsed', 'updatedAt']);
    }

    // Clipboard Items
    match /clipboardItems/{itemId} {
      function isValidItem(data) {
        return data.userId == request.auth.uid &&
               data.type in ['text', 'image'] &&
               (data.type == 'text' ? (data.content is string && data.content.size() <= 50000) : true) &&
               (data.type == 'image' ? (data.imageUrl is string && data.imageUrl.size() <= 1000) : true) &&
               data.size is number &&
               data.createdAt is timestamp &&
               data.keys().hasAll(['userId', 'type', 'createdAt', 'size']) &&
               data.keys().size() <= 12;
      }
      allow list: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow get: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn() && isValidItem(incoming()) && incoming().createdAt == request.time;
      allow update: if isOwner(existing().userId) && isValidItem(incoming()) &&
                    incoming().userId == existing().userId &&
                    incoming().diff(existing()).affectedKeys().hasOnly(['labelId', 'pinned', 'updatedAt', 'content']);
      allow delete: if isOwner(existing().userId);
    }

    // Labels
    match /labels/{labelId} {
      function isValidLabel(data) {
        return data.userId == request.auth.uid &&
               data.name is string && data.name.size() > 0 && data.name.size() <= 50 &&
               data.keys().hasAll(['userId', 'name', 'createdAt']) &&
               data.keys().size() <= 4;
      }
      allow list: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow get: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn() && isValidLabel(incoming()) && incoming().createdAt == request.time;
      allow update: if isOwner(existing().userId) && isValidLabel(incoming()) &&
                    incoming().diff(existing()).affectedKeys().hasOnly(['name']);
      allow delete: if isOwner(existing().userId);
    }
  }
}
```
