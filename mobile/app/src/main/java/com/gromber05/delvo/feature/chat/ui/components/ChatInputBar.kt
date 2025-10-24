package com.gromber05.delvo.feature.chat.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.TagFaces
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp


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
                else Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Enviar")
            }
        }
    }
}


