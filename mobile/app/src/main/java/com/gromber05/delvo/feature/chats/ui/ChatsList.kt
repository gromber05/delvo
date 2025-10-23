package com.gromber05.delvo.feature.chats.ui

import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.Divider
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.ui.unit.dp
import com.gromber05.delvo.core.model.chat.Chat

@Composable
fun ChatsList(chats: List<Chat>, onOpenChat: (Chat) -> Unit) {
    LazyColumn(
        modifier = Modifier,
        contentPadding = PaddingValues(vertical = 4.dp)
    ) {
        itemsIndexed(chats, key = { _, c -> c.id }) { _, chat ->
            ChatRow(chat = chat) { onOpenChat(chat) }
            Divider()
        }
    }
}
