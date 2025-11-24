package com.gromber05.delvo.data.remote

import com.gromber05.delvo.data.dto.UserDto
import com.gromber05.delvo.domain.model.User
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

interface ApiService {

    @POST("user")
    suspend fun registerUser(
        @Header("Authorization") authorization: String,
        @Body user: User
    ): Response<Unit>

    @GET("user/{uid}")
    suspend fun getUser(
        @Header("Authorization") authorization: String,
        @Path("uid") uid: String
    ): Response<UserDto>

    @GET("user")
    suspend fun getAllUsers(
        @Header("Authorization") authorization: String
    ): Response<List<UserDto>>

    @PUT("user/{uid}")
    suspend fun updateUser(
        @Header("Authorization") authorization: String,
        @Path("uid") uid: String,
        @Body update: UserDto
    ): Response<UserDto>

    @DELETE("user/{uid}")
    suspend fun deleteUser(
        @Header("Authorization") authorization: String,
        @Path("uid") uid: String
    ): Response<Unit>
}


