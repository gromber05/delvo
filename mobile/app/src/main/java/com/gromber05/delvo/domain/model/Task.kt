package com.gromber05.delvo.domain.model

data class Task(
    val id: String,
    val title: String,
    val description: String,
    val isDone: Boolean,
    val createdAt: Long,
)
