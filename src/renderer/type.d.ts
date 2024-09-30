export type LaunchConfig = {
    type: 'remote',
    url: string,
    api: string,
    name: string
} | {
    type: 'local',
    path: string,
    name: string
}