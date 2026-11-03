export type IUserId = string
export type IRoomName = string
export type IRoomId = string

export interface IUser {
  id: string
  username: string
  avatarSrc: string
}

export interface IRoom {
  userList: IUser[]
  name: IRoomName
  id: IRoomId
  passwordHash?: string
  removeTimer?: NodeJS.Timeout
}

export interface IPublicRoom {
  id: IRoomId
  name: IRoomName
  userList: IUser[]
  hasPassword: boolean
}

export type JoinRoomCredentials = {
  password?: string
  token?: string
}

export type JoinRoomResult =
  | { isJoined: true; room: IRoom; token?: string }
  | { isJoined: false; isWrongPassword: boolean }
