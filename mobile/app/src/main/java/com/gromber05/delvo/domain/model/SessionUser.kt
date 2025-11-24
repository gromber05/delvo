package com.gromber05.delvo.domain.model

data class SessionUser(
    val uid: String,
    val email: String,
    val username: String,
    val dob: String,
    val isAdmin: Boolean
)
