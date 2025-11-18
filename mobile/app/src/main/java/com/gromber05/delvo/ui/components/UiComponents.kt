package com.gromber05.delvo.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

object UiComponents {

    @Composable
    fun TextDivider(text: String) {
        Row(
            modifier = Modifier.Companion
                .fillMaxWidth()
                .padding(vertical = 16.dp),
            verticalAlignment = Alignment.Companion.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            HorizontalDivider(
                modifier = Modifier.Companion.weight(1f),
                thickness = 1.dp,
                color = Color.Companion.LightGray
            )

            Text(
                text = text,
                modifier = Modifier.Companion.padding(horizontal = 8.dp),
                color = Color.Companion.Gray
            )

            HorizontalDivider(
                modifier = Modifier.Companion.weight(1f),
                thickness = 1.dp,
                color = Color.Companion.LightGray
            )
        }
    }
}