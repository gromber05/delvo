package com.gromber05.delvo.data.remote

import com.gromber05.delvo.domain.model.MeResponse
import retrofit2.http.GET
import retrofit2.http.Header

interface ApiService {

    @GET("me")
    suspend fun getMyInfo(
        @Header("Authorization") authorization: String
    ): MeResponse
}

