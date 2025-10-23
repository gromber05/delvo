package com.gromber05.delvo.preview

import com.gromber05.delvo.core.model.chat.Chat
import com.gromber05.delvo.core.model.chat.Message

val sampleChats = listOf(
    Chat("1","María López","¿Mañana a las 10 te viene bien?","19:40", unread = 2),
    Chat("2","Carlos Ruiz","Genial, nos vemos allí","18:12"),
    Chat("3","Equipo Android","Subí el PR a develop","Ayer", unread = 5),
    Chat("4","Mamá","Ok 👍","Lun"),
)

val sampleMessages = listOf(
    Message("m1","¡Hola! ¿Cómo vas?", mine = false, time = "19:33", dateHeader = "Hoy"),
    Message("m2","Bien, ¿y tú?", mine = true, time = "19:34"),
    Message("m3","Todo ok. ¿Quedamos mañana?", mine = false, time = "19:35"),
    Message("m4","Perfecto, sobre las 10.", mine = true, time = "19:36"),
    Message("m5","Hecho ✅", mine = false, time = "19:37"),
)
