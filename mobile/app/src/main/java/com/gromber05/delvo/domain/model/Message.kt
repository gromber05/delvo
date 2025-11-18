package com.gromber05.delvo.domain.model

import java.sql.Time

data class Message(
    val id: String,
    val senderId: String,
    val chatId: String,
    val content: String,
    val timeStamp: Time,
    val sent: Boolean
)
