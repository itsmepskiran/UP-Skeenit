# ---------------------------------------------------------
# ROLE DEFINITIONS
# ---------------------------------------------------------
ROLES = {
    "admin": {
        "inherits": ["recruiter", "candidate"],
        "permissions": [
            "jobs:create",
            "jobs:update",
            "jobs:delete",
            "jobs:view",
            "applications:view",
            "applications:update",
            "analytics:view",
            "dashboard:view",
            "users:manage",
        ],
    },

    "recruiter": {
        "inherits": ["candidate"],
        "permissions": [
            "jobs:create",
            "jobs:update",
            "jobs:delete",
            "jobs:view",
            "applications:view",
            "applications:update",
            "dashboard:view",
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
