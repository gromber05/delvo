package com.gromber05.delvo.feature.chats.ui

import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.ui.Modifier
import com.gromber05.delvo.core.model.chat.Chat
import com.gromber05.delvo.preview.sampleChats

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(onOpenChat: (Chat) -> Unit) {
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Chats", "Llamadas")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Delvo") },
                actions = {
                    IconButton(onClick = {}) { Icon(Icons.Default.Search, null) }
                    IconButton(onClick = {}) { Icon(Icons.Default.MoreVert, null) }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = {}) {
                Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Nuevo chat")
            }
        }
    ) { padding ->
        Column(Modifier.padding(padding)) {
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { i, title ->
                    Tab(selected = selectedTab == i, onClick = { selectedTab = i }, text = { Text(title) })
                }
            }
            when (selectedTab) {
                0 -> ChatsList(sampleChats, onOpenChat)
                1 -> PlaceholderTab(icon = Icons.Default.Call, text = "Llamadas")
            }
        }
    }
}
