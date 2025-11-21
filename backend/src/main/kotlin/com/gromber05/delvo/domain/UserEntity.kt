package com.gromber05.delvo.domain

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "users")
data class UserEntity(
    @Id
    val uid: String,
    val email: String,
    val isAdmin: Boolean = false
)
