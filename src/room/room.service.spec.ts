import { Test, TestingModule } from '@nestjs/testing'
import { RoomService } from './room.service'
import { IUser, JoinRoomResult } from './room.types'

process.env.ROOM_TOKEN_SECRET = 'test-room-token-secret'

const PROTECTED_ROOM_TTL_MS = 5 * 60 * 1000

const user = (id: string): IUser => ({
  id,
  username: id,
  avatarSrc: '',
})

const expectJoined = (result: JoinRoomResult) => {
  if (!result.isJoined) {
    throw new Error('expected join to succeed')
  }

  return result
}

describe('RoomService', () => {
  let service: RoomService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomService],
    }).compile()

    service = module.get<RoomService>(RoomService)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('creates a protected room and rejects a join without the password', () => {
    const joined = expectJoined(
      service.joinRoom('passRoom', user('1'), { password: 'secret' }),
    )

    expect(joined.token).toEqual(expect.any(String))
    expect(service.toPublicRoom(joined.room)).toEqual({
      id: 'passRoom',
      name: 'passRoom',
      userList: [user('1')],
      hasPassword: true,
    })
    expect(service.toPublicRoom(joined.room)).not.toHaveProperty('passwordHash')
    expect(service.joinRoom('passRoom', user('2'), {})).toEqual({
      isJoined: false,
      isWrongPassword: false,
    })
    expect(
      service.joinRoom('passRoom', user('2'), { password: 'wrong' }),
    ).toEqual({
      isJoined: false,
      isWrongPassword: true,
    })
    expect(service.getRoom('passRoom').userList).toEqual([user('1')])
  })

  it('lets a user in with the password or a token and ignores a password on an open room', () => {
    const created = expectJoined(
      service.joinRoom('passRoom', user('1'), { password: 'secret' }),
    )
    const byPassword = expectJoined(
      service.joinRoom('passRoom', user('2'), { password: 'secret' }),
    )
    const byToken = expectJoined(
      service.joinRoom('passRoom', user('3'), { token: created.token }),
    )

    expect(byPassword.token).toEqual(expect.any(String))
    expect(byToken.room.userList.map((roomUser) => roomUser.id)).toEqual([
      '1',
      '2',
      '3',
    ])

    const openRoom = expectJoined(service.joinRoom('openRoom', user('1'), {}))
    const joinedOpenRoom = expectJoined(
      service.joinRoom('openRoom', user('2'), { password: 'secret' }),
    )

    expect(openRoom.token).toBeUndefined()
    expect(joinedOpenRoom.token).toBeUndefined()
    expect(service.toPublicRoom(joinedOpenRoom.room).hasPassword).toBe(false)
  })

  it('rejects a token that was issued for another room', () => {
    const joined = expectJoined(
      service.joinRoom('passRoom', user('1'), { password: 'secret' }),
    )
    service.joinRoom('otherRoom', user('2'), { password: 'other' })

    expect(
      service.joinRoom('otherRoom', user('3'), { token: joined.token }),
    ).toEqual({
      isJoined: false,
      isWrongPassword: true,
    })
  })

  it('deletes an open room as soon as it becomes empty and keeps default rooms', () => {
    service.joinRoom('openRoom', user('1'), {})
    service.removeUserFromRoom('openRoom', '1')
    expect(() => service.getRoom('openRoom')).toThrow()

    service.joinRoom('kaptoiiika', user('1'), {})
    service.removeUserFromRoom('kaptoiiika', '1')
    expect(service.getRoom('kaptoiiika').userList).toEqual([])
  })

  it('keeps an empty protected room for 5 minutes and cancels removal when someone returns', () => {
    jest.useFakeTimers()
    const joined = expectJoined(
      service.joinRoom('passRoom', user('1'), { password: 'secret' }),
    )

    service.removeUserFromRoom('passRoom', '1')
    expectJoined(
      service.joinRoom('passRoom', user('1'), { token: joined.token }),
    )
    jest.advanceTimersByTime(PROTECTED_ROOM_TTL_MS)
    expect(service.getRoom('passRoom').userList).toEqual([user('1')])

    service.removeUserFromRoom('passRoom', '1')
    jest.advanceTimersByTime(PROTECTED_ROOM_TTL_MS - 1)
    expect(service.getRoom('passRoom').userList).toEqual([])
    jest.advanceTimersByTime(1)
    expect(() => service.getRoom('passRoom')).toThrow()
  })

  it('recreates a deleted protected room from its token with the same password', () => {
    jest.useFakeTimers()
    const joined = expectJoined(
      service.joinRoom('passRoom', user('1'), { password: 'secret' }),
    )

    service.removeUserFromRoom('passRoom', '1')
    jest.advanceTimersByTime(PROTECTED_ROOM_TTL_MS)

    const recreated = expectJoined(
      service.joinRoom('passRoom', user('1'), { token: joined.token }),
    )

    expect(service.toPublicRoom(recreated.room).hasPassword).toBe(true)
    expect(
      service.joinRoom('passRoom', user('2'), { password: 'wrong' }),
    ).toEqual({
      isJoined: false,
      isWrongPassword: true,
    })
    expect(
      expectJoined(
        service.joinRoom('passRoom', user('2'), { token: joined.token }),
      ).room.userList.map((roomUser) => roomUser.id),
    ).toEqual(['1', '2'])
  })
})
