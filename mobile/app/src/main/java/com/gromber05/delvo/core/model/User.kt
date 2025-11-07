package com.gromber05.delvo.core.model

import java.util.UUID

data class User(
    val id: UUID,
    val username: String,
    val email: String,
    val password: String,
    val phoneNumber: String
)
