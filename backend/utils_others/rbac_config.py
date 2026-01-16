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
            "analytics:view",
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
        ],
    },

    "candidate": {
        "inherits": [],
        "permissions": [
            "applications:create",
            "applications:view",
            "profile:update",
            "video:upload",
        ],
    },
}
