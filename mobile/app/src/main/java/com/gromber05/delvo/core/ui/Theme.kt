package com.gromber05.delvo.core.ui

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
import com.gromber05.delvo.core.ui.theme.DelvoBackgroundDark
import com.gromber05.delvo.core.ui.theme.DelvoBackgroundLight
import com.gromber05.delvo.core.ui.theme.DelvoErrorDark
import com.gromber05.delvo.core.ui.theme.DelvoErrorLight
import com.gromber05.delvo.core.ui.theme.DelvoOnBackgroundDark
import com.gromber05.delvo.core.ui.theme.DelvoOnBackgroundLight
import com.gromber05.delvo.core.ui.theme.DelvoOnErrorDark
import com.gromber05.delvo.core.ui.theme.DelvoOnErrorLight
import com.gromber05.delvo.core.ui.theme.DelvoOnPrimaryContainerDark
import com.gromber05.delvo.core.ui.theme.DelvoOnPrimaryContainerLight
import com.gromber05.delvo.core.ui.theme.DelvoOnPrimaryDark
import com.gromber05.delvo.core.ui.theme.DelvoOnPrimaryLight
import com.gromber05.delvo.core.ui.theme.DelvoOnSecondaryContainerDark
import com.gromber05.delvo.core.ui.theme.DelvoOnSecondaryContainerLight
import com.gromber05.delvo.core.ui.theme.DelvoOnSecondaryDark
import com.gromber05.delvo.core.ui.theme.DelvoOnSecondaryLight
import com.gromber05.delvo.core.ui.theme.DelvoOnSurfaceDark
import com.gromber05.delvo.core.ui.theme.DelvoOnSurfaceLight
import com.gromber05.delvo.core.ui.theme.DelvoOnSurfaceVariantDark
import com.gromber05.delvo.core.ui.theme.DelvoOnSurfaceVariantLight
import com.gromber05.delvo.core.ui.theme.DelvoOnTertiaryDark
import com.gromber05.delvo.core.ui.theme.DelvoOnTertiaryLight
import com.gromber05.delvo.core.ui.theme.DelvoOutlineDark
import com.gromber05.delvo.core.ui.theme.DelvoOutlineLight
import com.gromber05.delvo.core.ui.theme.DelvoPrimaryContainerDark
import com.gromber05.delvo.core.ui.theme.DelvoPrimaryContainerLight
import com.gromber05.delvo.core.ui.theme.DelvoPrimaryDark
import com.gromber05.delvo.core.ui.theme.DelvoPrimaryLight
import com.gromber05.delvo.core.ui.theme.DelvoSecondaryContainerDark
import com.gromber05.delvo.core.ui.theme.DelvoSecondaryContainerLight
import com.gromber05.delvo.core.ui.theme.DelvoSecondaryDark
import com.gromber05.delvo.core.ui.theme.DelvoSecondaryLight
import com.gromber05.delvo.core.ui.theme.DelvoShapes
import com.gromber05.delvo.core.ui.theme.DelvoSurfaceDark
import com.gromber05.delvo.core.ui.theme.DelvoSurfaceLight
import com.gromber05.delvo.core.ui.theme.DelvoSurfaceVariantDark
import com.gromber05.delvo.core.ui.theme.DelvoSurfaceVariantLight
import com.gromber05.delvo.core.ui.theme.DelvoTertiaryDark
import com.gromber05.delvo.core.ui.theme.DelvoTertiaryLight
import com.gromber05.delvo.core.ui.theme.DelvoTypography

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