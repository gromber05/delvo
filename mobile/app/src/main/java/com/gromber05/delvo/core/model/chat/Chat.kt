package com.gromber05.delvo.core.model.chat

data class Chat(
    val id: String,
    val name: String,
    val lastMessage: String,
    val time: String,
    val unread: Int = 0,
    val image: String? = null
)