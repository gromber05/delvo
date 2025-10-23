package com.gromber05.delvo

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.tooling.preview.Preview
import com.gromber05.delvo.core.desingsystem.DelvoTheme
import com.gromber05.delvo.core.model.chat.Chat
import com.gromber05.delvo.core.model.chat.Message
import com.gromber05.delvo.core.navigation.Screen
import com.gromber05.delvo.feature.chat.ui.ChatScreen
import com.gromber05.delvo.feature.chats.ui.HomeScreen
import com.gromber05.delvo.preview.sampleChats

@Composable
fun DelvoApp() {
    DelvoTheme {
        var currentScreen by remember { mutableStateOf<Screen>(Screen.Home) }
        var openedChat by remember { mutableStateOf(sampleChats.first()) }

        when (val s = currentScreen) {
            is Screen.Home -> HomeScreen(
                onOpenChat = { chat ->
                    openedChat = chat
                    currentScreen = Screen.ChatDetail(chat)
                }
            )
            is Screen.ChatDetail -> ChatScreen(
                chat = openedChat,
                onBack = { currentScreen = Screen.Home }
            )
        }
    }
}

// ---------- PREVIEWS ----------
@Preview(showBackground = true)
@Composable
fun PreviewHome() {
    DelvoTheme { HomeScreen(onOpenChat = {}) }
}

@Preview(showBackground = true)
@Composable
fun PreviewChat() {
    DelvoTheme { ChatScreen(sampleChats.first(), onBack = {}) }
}
