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
}
