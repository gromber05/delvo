package com.gromber05.delvo.dto

data class RegisterUserRequest(
    val email: String,
    val username: String,
    val dob: String?,
    val rol: String
)

data class UpdateUserRequest(
    val username: String?,
    val dob: String?,
    val rol: String?
)

data class UserResponse(
    val id: Long?,
    val uid: String,
    val email: String,
    val username: String,
    val dob: String?,
    val rol: String
)
