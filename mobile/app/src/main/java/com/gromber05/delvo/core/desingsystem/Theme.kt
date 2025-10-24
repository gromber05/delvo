package com.gromber05.delvo.core.desingsystem

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import com.gromber05.delvo.core.desingsystem.theme.*

private val DelvoLightScheme: ColorScheme = lightColorScheme(
    primary = DelvoPrimaryLight,
    onPrimary = DelvoOnPrimaryLight,
    primaryContainer = DelvoPrimaryContainerLight,
    onPrimaryContainer = DelvoOnPrimaryContainerLight,

    secondary = DelvoSecondaryLight,
    onSecondary = DelvoOnSecondaryLight,
    secondaryContainer = DelvoSecondaryContainerLight,
    onSecondaryContainer = DelvoOnSecondaryContainerLight,

    tertiary = DelvoTertiaryLight,
    onTertiary = DelvoOnTertiaryLight,

    background = DelvoBackgroundLight,
    onBackground = DelvoOnBackgroundLight,
    surface = DelvoSurfaceLight,
    onSurface = DelvoOnSurfaceLight,
    surfaceVariant = DelvoSurfaceVariantLight,
    onSurfaceVariant = DelvoOnSurfaceVariantLight,
    outline = DelvoOutlineLight,

    error = DelvoErrorLight,
    onError = DelvoOnErrorLight
)

private val DelvoDarkScheme: ColorScheme = darkColorScheme(
    primary = DelvoPrimaryDark,
    onPrimary = DelvoOnPrimaryDark,
    primaryContainer = DelvoPrimaryContainerDark,
    onPrimaryContainer = DelvoOnPrimaryContainerDark,

    secondary = DelvoSecondaryDark,
    onSecondary = DelvoOnSecondaryDark,
    secondaryContainer = DelvoSecondaryContainerDark,
    onSecondaryContainer = DelvoOnSecondaryContainerDark,

    tertiary = DelvoTertiaryDark,
    onTertiary = DelvoOnTertiaryDark,

    background = DelvoBackgroundDark,
    onBackground = DelvoOnBackgroundDark,
    surface = DelvoSurfaceDark,
    onSurface = DelvoOnSurfaceDark,
    surfaceVariant = DelvoSurfaceVariantDark,
    onSurfaceVariant = DelvoOnSurfaceVariantDark,
    outline = DelvoOutlineDark,

    error = DelvoErrorDark,
    onError = DelvoOnErrorDark
)

@Composable
fun DelvoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DelvoDarkScheme
        else -> DelvoLightScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = DelvoTypography,
        shapes = DelvoShapes,
        content = content
    )
}
