# ---------------------------------------------------------
# ROLE DEFINITIONS (RBAC CONFIG)
# ---------------------------------------------------------

ROLES = {
    "admin": {
        "inherits": ["recruiter", "candidate"],
        "permissions": [
            # Job management
            "jobs:create",
            "jobs:update",
            "jobs:delete",
            "jobs:view",

            # Applications
            "applications:view",
            "applications:update",

            # Analytics + Dashboard
            "analytics:view",
            "dashboard:view",

            # User management
            "users:manage",

            # Notifications
            "notifications:create",
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

            # Dashboard
            "dashboard:view",

            # Notifications
            "notifications:create",
        ],
    },

    "candidate": {
        "inherits": [],
        "permissions": [
            # Applications
            "applications:create",
            "applications:view",

            # Profile
            "profile:update",

            # Video uploads
            "video:upload",

            # Dashboard
            "dashboard:view",
        ],
    },
}
