package com.gromber05.delvo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.TagFaces
import androidx.compose.material.icons.filled.VideoCall
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// ---------- DATA MODELS ----------
data class Chat(
    val id: String,
    val name: String,
    val lastMessage: String,
    val time: String,
    val unread: Int = 0,
)

data class Message(
    val id: String,
    val text: String,
    val mine: Boolean,
    val time: String,
    val dateHeader: String? = null, // "Hoy", "Ayer", "12/10/2025"
)

// ---------- MAIN ACTIVITY ----------
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { WhatsLikeApp() }
    }
}

// ---------- THEME (simple) ----------
@Composable
fun WhatsLikeTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Color(0xFF0F9D58), // verde genérico
            secondary = Color(0xFF25A766),
            surfaceVariant = Color(0xFFEFF3F0)
        ),
        typography = Typography(),
        content = content
    )
}

// ---------- APP ROOT ----------
@Composable
fun WhatsLikeApp() {
    WhatsLikeTheme {
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

sealed class Screen {
    data object Home : Screen()
    data class ChatDetail(val chat: Chat) : Screen()
}

// ---------- HOME: TABS + LISTA CHATS ----------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(onOpenChat: (Chat) -> Unit) {
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Chats", "Estados", "Llamadas")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Mensajería") },
                actions = {
                    IconButton(onClick = {}) { Icon(Icons.Default.Search, contentDescription = "Buscar") }
                    IconButton(onClick = {}) { Icon(Icons.Default.MoreVert, contentDescription = "Más") }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = {}) {
                Icon(Icons.Default.Add, contentDescription = "Nuevo chat")
            }
        }
    ) { padding ->
        Column(Modifier.padding(padding)) {
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title) }
                    )
                }
            }
            when (selectedTab) {
                0 -> ChatsList(sampleChats, onOpenChat)
                1 -> PlaceholderTab(icon = Icons.Default.CameraAlt, text = "Estados")
                2 -> PlaceholderTab(icon = Icons.Default.Call, text = "Llamadas")
            }
        }
    }
}

@Composable
private fun PlaceholderTab(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.height(8.dp))
            Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun ChatsList(chats: List<Chat>, onOpenChat: (Chat) -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = 4.dp)
    ) {
        itemsIndexed(chats, key = { _, c -> c.id }) { _, chat ->
            ChatRow(chat = chat, onClick = { onOpenChat(chat) })
            Divider()
        }
    }
}

@Composable
fun ChatRow(chat: Chat, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 10.dp)
            .fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Avatar genérico
        Box(
            Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center
        ) {
            Text(chat.name.take(1), fontWeight = FontWeight.Bold)
        }

        Spacer(Modifier.width(12.dp))

        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(chat.name, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, modifier = Modifier.weight(1f))
                Text(chat.time, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(2.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.width(4.dp))
                Text(
                    chat.lastMessage,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        if (chat.unread > 0) {
            Spacer(Modifier.width(8.dp))
            Badge(containerColor = MaterialTheme.colorScheme.primary) {
                Text(chat.unread.toString(), color = Color.White, fontSize = 12.sp)
            }
        }
    }
}

// ---------- CHAT DETAIL ----------
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
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) { Text(chat.name.take(1), fontWeight = FontWeight.Bold) }
                        Spacer(Modifier.width(8.dp))
                        Column {
                            Text(chat.name, fontWeight = FontWeight.SemiBold)
                            Text("en línea", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.Check, contentDescription = "Volver") }
                },
                actions = {
                    IconButton(onClick = {}) { Icon(Icons.Default.VideoCall, contentDescription = "Videollamada") }
                    IconButton(onClick = {}) { Icon(Icons.Default.Call, contentDescription = "Llamada") }
                    IconButton(onClick = {}) { Icon(Icons.Default.Menu, contentDescription = "Menú") }
                }
            )
        },
        bottomBar = {
            ChatInputBar(
                value = input,
                onValueChange = { input = it },
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
            reverseLayout = true // mensajes como chat (últimos abajo)
        ) {
            // Agrupar por fecha con sticky headers (en reverse layout, el orden visual se invierte)
            var lastHeader: String? = null
            itemsIndexed(messages.asReversed(), key = { _, m -> m.id }) { _, msg ->
                if (msg.dateHeader != null && msg.dateHeader != lastHeader) {
                    lastHeader = msg.dateHeader
                    DateChip(date = msg.dateHeader)
                }
                MessageBubble(message = msg)
                Spacer(Modifier.height(6.dp))
            }
        }
    }
}

@Composable
fun DateChip(date: String) {
    Box(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            color = MaterialTheme.colorScheme.surfaceVariant,
            shape = RoundedCornerShape(12.dp)
        ) {
            Text(
                text = date,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 12.sp
            )
        }
    }
}

@Composable
fun MessageBubble(message: Message) {
    val bubbleColor =
        if (message.mine) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
        else MaterialTheme.colorScheme.surfaceVariant
    val alignment = if (message.mine) Alignment.End else Alignment.Start
    val shape = if (message.mine)
        RoundedCornerShape(topStart = 16.dp, topEnd = 4.dp, bottomEnd = 16.dp, bottomStart = 16.dp)
    else
        RoundedCornerShape(topStart = 4.dp, topEnd = 16.dp, bottomEnd = 16.dp, bottomStart = 16.dp)

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (message.mine) Arrangement.End else Arrangement.Start
    ) {
        Surface(
            color = bubbleColor,
            shape = shape,
            tonalElevation = 0.dp
        ) {
            Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) {
                Text(message.text)
                Spacer(Modifier.height(2.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.End,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(message.time, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (message.mine) {
                        Spacer(Modifier.width(4.dp))
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "Entregado",
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ChatInputBar(
    value: String,
    onValueChange: (String) -> Unit,
    onSend: () -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(24.dp),
            tonalElevation = 1.dp
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = {}) { Icon(Icons.Default.TagFaces, contentDescription = "Emoji") }
                TextField(
                    value = value,
                    onValueChange = onValueChange,
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Escribe un mensaje") },
                    singleLine = true,
                    colors = TextFieldDefaults.colors(
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                        disabledIndicatorColor = Color.Transparent
                    )
                )
                IconButton(onClick = {}) { Icon(Icons.Default.AttachFile, contentDescription = "Adjuntar") }
                IconButton(onClick = {}) { Icon(Icons.Default.CameraAlt, contentDescription = "Cámara") }
            }
        }
        Spacer(Modifier.width(8.dp))
        AnimatedContent(targetState = value.isBlank(), label = "send_mic") { blank ->
            FilledIconButton(onClick = { if (blank) {} else onSend() }, shape = CircleShape) {
                if (blank) Icon(Icons.Default.Mic, contentDescription = "Hablar")
                else Icon(Icons.Default.Send, contentDescription = "Enviar")
            }
        }
    }
}

// ---------- SAMPLE DATA ----------
private val sampleChats = listOf(
    Chat("1", "María López", "¿Mañana a las 10 te viene bien?", "19:40", unread = 2),
    Chat("2", "Carlos Ruiz", "Genial, nos vemos allí", "18:12"),
    Chat("3", "Equipo Android", "Subí el PR a develop", "Ayer", unread = 5),
    Chat("4", "Mamá", "Ok 👍", "Lun"),
)

private val sampleMessages = listOf(
    Message("m1", "¡Hola! ¿Cómo vas?", mine = false, time = "19:33", dateHeader = "Hoy"),
    Message("m2", "Bien, ¿y tú?", mine = true, time = "19:34"),
    Message("m3", "Todo ok. ¿Quedamos mañana?", mine = false, time = "19:35"),
    Message("m4", "Perfecto, sobre las 10.", mine = true, time = "19:36"),
    Message("m5", "Hecho ✅", mine = false, time = "19:37"),
)

// ---------- PREVIEWS ----------
@Preview(showBackground = true)
@Composable
fun PreviewHome() {
    WhatsLikeTheme { HomeScreen(onOpenChat = {}) }
}

@Preview(showBackground = true)
@Composable
fun PreviewChat() {
    WhatsLikeTheme { ChatScreen(sampleChats.first(), onBack = {}) }
}
