package com.gromber05.delvo.domain

import jakarta.persistence.*

@Entity
@Table(name = "users")
data class AppUser(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(nullable = false, unique = true)
    val uid: String,                  // uid de Firebase

    @Column(nullable = false, unique = true)
    val email: String,

    @Column(nullable = false)
    val username: String,

    @Column(nullable = true)
    val dob: String?,

    @Column(nullable = false)
    val rol: String
)
