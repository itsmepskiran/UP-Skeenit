ROLES = {
    "admin": {
        "inherits": ["recruiter", "candidate"],
        "permissions": [
            "jobs:create", "jobs:update", "jobs:delete", "jobs:view",
            "applications:view", "applications:update",
            "analytics:view", "dashboard:view",
            "users:manage", "notifications:create",
        ],
    },

    "recruiter": {
        "inherits": ["candidate"],
        "permissions": [
            # Job management
            "jobs:create",
            "jobs:update",
            "jobs:delete",
            "jobs:view",

            # Applications
            "applications:view",
            "applications:update",

            # Profile (Explicitly added)
            "profile:update",  # ✅ ADDED THIS

            # Dashboard
            "dashboard:view",

            # Notifications
            "notifications:create",
            
            # Analytics
            "analytics:view",
        ],
    },

    "candidate": {
        "inherits": [],
        "permissions": [
            "applications:create",
            "applications:view",
            "profile:update",
            "video:upload",
            "dashboard:view",
        ],
    },
}