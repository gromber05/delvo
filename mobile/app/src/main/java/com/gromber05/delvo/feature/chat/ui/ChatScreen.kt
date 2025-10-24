package com.gromber05.delvo.feature.chat.ui

import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.LocalOnBackPressedDispatcherOwner
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
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
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.rememberAsyncImagePainter
import com.gromber05.delvo.core.model.chat.Chat
import com.gromber05.delvo.core.model.chat.Message
import com.gromber05.delvo.feature.chat.ui.components.ChatInputBar
import com.gromber05.delvo.feature.chat.ui.components.DateChip
import com.gromber05.delvo.feature.chat.ui.components.MessageBubble
import com.gromber05.delvo.preview.PreviewDelvo
import com.gromber05.delvo.preview.sampleChats
import com.gromber05.delvo.preview.sampleMessages
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(chat: Chat, onBack: () -> Unit) {
    val listState = rememberLazyListState()
    var input by remember { mutableStateOf("") }
    val messages = remember { mutableStateListOf<Message>().apply { addAll(sampleMessages) } }

    val backDispatcher = LocalOnBackPressedDispatcherOwner.current?.onBackPressedDispatcher
    DisposableEffect(backDispatcher) {
        val cb = object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() = onBack()
        }
        backDispatcher?.addCallback(cb)
        onDispose { cb.remove() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (chat.image == null) {
                            Box(
                                Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(chat.name.take(1), fontWeight = FontWeight.Bold)
                            }
                        } else {
                            Box(
                                Modifier
                                    .size(36.dp)
                                    .clip(CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Image(
                                    painter = rememberAsyncImagePainter(chat.image),
                                    contentDescription = "Foto de perfil"
                                )
                            }
                        }
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
                                time = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"))
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

@Preview(showBackground = true)
@Composable
fun PreviewChatScreen() {
    PreviewDelvo { ChatScreen(chat = sampleChats.first(), onBack = {}) }
}
