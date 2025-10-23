package com.gromber05.delvo.feature.chat.ui

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.gromber05.delvo.core.model.chat.Chat
import com.gromber05.delvo.core.model.chat.Message
import com.gromber05.delvo.feature.chat.ui.components.DateChip
import com.gromber05.delvo.feature.chat.ui.components.MessageBubble
import com.gromber05.delvo.preview.sampleMessages

@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(chat: Chat, onBack: () -> Unit) {
    val listState = rememberLazyListState()
    var input by remember { mutableStateOf("") }
    val messages = remember { mutableStateListOf<Message>().apply { addAll(sampleMessages) } }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.background),
                            contentAlignment = Alignment.Center
                        ) { Text(chat.name.take(1), fontWeight = FontWeight.Bold) }
                        Spacer(Modifier.width(8.dp))
                        Column(
                        ) {
                            Text(chat.name, fontWeight = FontWeight.Medium)
                            Text("en línea", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.Close, contentDescription = "Volver") }
                },
                actions = {
                    IconButton(onClick = {}) { Icon(Icons.Default.Videocam, contentDescription = "Videollamada") }
                    IconButton(onClick = {}) { Icon(Icons.Default.Call, contentDescription = "Llamada") }
                    IconButton(onClick = {}) { Icon(Icons.Default.Menu, contentDescription = "Menú") }
                }
            )
        },
        bottomBar = {
            ChatInputBar(
                value = input,
                onValueChange = { newInput -> input = newInput },
                onSend = {
                    if (input.isNotBlank()) {
                        messages.add(
                            Message(
                                id = System.currentTimeMillis().toString(),
                                text = input.trim(),
                                mine = true,
                                time = "20:14"
                            )
                        )
                        input = ""
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            state = listState,
            contentPadding = PaddingValues(vertical = 8.dp, horizontal = 8.dp),
            reverseLayout = true
        ) {
            var lastHeader: String? = null
            itemsIndexed(messages.asReversed(), key = { _, m -> m.id }) { _, msg ->
                if (msg.dateHeader != null && msg.dateHeader != lastHeader) {
                    lastHeader = msg.dateHeader
                    Spacer(Modifier.padding(1.dp))
                    DateChip(date = msg.dateHeader)
                }
                MessageBubble(message = msg)
                Spacer(Modifier.height(6.dp))
            }
        }
    }
}

@Composable
fun ChatInputBar(value: String, onValueChange: () -> Unit, onSend: () -> Unit) {
    TODO("Not yet implemented")
}
