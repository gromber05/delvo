package com.gromber05.delvo.core.navigation

import com.gromber05.delvo.core.model.chat.Chat

sealed class Screen {
    data object Home : Screen()
    data class ChatDetail(val chat: Chat) : Screen()
}