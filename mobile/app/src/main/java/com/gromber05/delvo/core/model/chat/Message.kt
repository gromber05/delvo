package com.gromber05.delvo.core.model.chat

data class Message(
    val id: String,
    val text: String,
    val mine: Boolean,
    val time: String,
    val dateHeader: String? = null,
)