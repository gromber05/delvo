package com.gromber05.delvo.domain.model

data class User(
    val id: Int,
    val username: String,
    val passwd: String,
    val email: String,
    val phoneNumber: String,
    val avatarUrl: String?,
    val chatList: List<User>,
    val role: Roles =  Roles.USER,
)
