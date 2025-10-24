package com.gromber05.delvo.preview

import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import com.gromber05.delvo.core.desingsystem.DelvoTheme

@Composable
fun PreviewDelvo(content: @Composable () -> Unit) {
    DelvoTheme {
        Surface { content() }
    }
}
