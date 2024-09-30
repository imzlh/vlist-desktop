<script lang="ts" setup>
    import { Directive, watch } from 'vue'
    import type { LaunchConfig } from './type';
    import { reactive } from 'vue'

    const configs = reactive<LaunchConfig[]>(JSON.parse(localStorage.getItem('configs') || '[]')),
        edit = reactive({
            id: -1
        }),
        // 当按下且500ms后鼠标依旧在原处触发回调
        vDeepClick = {
            mounted(el: HTMLElement, binding){
                el.addEventListener('click', e => {
                    function clean(){
                        document.removeEventListener('pointermove', cb);
                        el.removeEventListener('dblclick', cb2);
                        clearTimeout(timer);
                    }
                    function cb(ev: PointerEvent){
                        if(Math.abs(ev.clientX - e.clientX) > 10 || Math.abs(ev.clientY - e.clientY) > 10)
                            clearTimeout(timer), clean();
                    }
                    function cb2(ev: MouseEvent){
                        ev;
                        clean();
                    }
                    document.addEventListener('pointermove', cb);
                    el.addEventListener('dblclick', cb2);
                    
                    let timer = setTimeout(() => {
                        binding.value(e);
                        clean();
                    }, 300)
                });
                
            }
        } satisfies Directive;

    function openSession(cfg: LaunchConfig){
        if(cfg.type == 'local')
            electron.ipcRenderer.send('create-server', cfg.path);
        else 
            electron.ipcRenderer.send('create-session', `?mode=main&api=${cfg.api}&proxy=${cfg.url}`);
        console.log('Try to open session', cfg);
    }

    function create(){
        configs.push({
            name: '新建配置',
            type: 'local',
            path: ''
        });
        edit.id = configs.length - 1;
    }

    watch(() => edit.id, () => localStorage.setItem('configs', JSON.stringify(configs)));
</script>

<template>
    <div class="left">
        <div class="logo">
            <img src="@imzlh/vlist/dist/favicon.svg" />
            <h1>vList Launcher</h1>
        </div>
    </div>
    <div class="right" @click="edit.id = -1">
        <div v-for="(config, id) in configs" :active="edit.id == id"
            v-deep-click="() => edit.id = id" @dblclick.stop="openSession(config)"
        >

            <!-- 编辑模式 -->
            <template v-if="edit.id == id">
                <div class="left" @dblclick.stop @click.stop>
                    <div class="local" :active="config.type == 'local'" @click="config.type = 'local'">
                        <svg viewBox="0 0 16 16">
                            <path d="M4.5 11a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1zM3 10.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
                            <path d="M16 11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V9.51c0-.418.105-.83.305-1.197l2.472-4.531A1.5 1.5 0 0 1 4.094 3h7.812a1.5 1.5 0 0 1 1.317.782l2.472 4.53c.2.368.305.78.305 1.198V11zM3.655 4.26 1.592 8.043C1.724 8.014 1.86 8 2 8h12c.14 0 .276.014.408.042L12.345 4.26a.5.5 0 0 0-.439-.26H4.094a.5.5 0 0 0-.44.26zM1 10v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1z"/>
                        </svg>
                    </div>
                    <div class="remote" :active="config.type == 'remote'" @click="config.type = 'remote'">
                        <svg viewBox="0 0 16 16">
                            <path d="M16 7.5a2.5 2.5 0 0 1-1.456 2.272 3.513 3.513 0 0 0-.65-.824 1.5 1.5 0 0 0-.789-2.896.5.5 0 0 1-.627-.421 3 3 0 0 0-5.22-1.625 5.587 5.587 0 0 0-1.276.088 4.002 4.002 0 0 1 7.392.91A2.5 2.5 0 0 1 16 7.5z"/>
                            <path d="M7 5a4.5 4.5 0 0 1 4.473 4h.027a2.5 2.5 0 0 1 0 5H3a3 3 0 0 1-.247-5.99A4.502 4.502 0 0 1 7 5zm3.5 4.5a3.5 3.5 0 0 0-6.89-.873.5.5 0 0 1-.51.375A2 2 0 1 0 3 13h8.5a1.5 1.5 0 1 0-.376-2.953.5.5 0 0 1-.624-.492V9.5z"/>
                        </svg>
                    </div>
                </div>

                <div class="right" @dblclick.stop @click.stop>
                    <div class="item">
                        <span>名称</span>
                        <input type="text" v-model="config.name" placeholder="配置名称">
                    </div>
                    <template v-if="config.type == 'local'" class="local">
                        <div class="item">
                            <span>路径</span>
                            <input type="text" v-model="config.path" placeholder="根目录路径" />
                        </div>
                    </template>
                    <template class="remote" v-else>
                        <div class="item">
                            <span>服务器</span>
                            <input type="text" v-model="config.url" placeholder="服务器地址">
                        </div>
                        <div class="item">
                            <span>API地址</span>
                            <input type="text" v-model="config.api" placeholder="vList API地址">
                            <div class="desc">
                                服务器API地址一般为服务器IP + "/@api/", 取决于Nginx location配置 
                            </div>
                        </div>
                    </template>
                </div>
            </template>
            
            <!-- 正常显示 -->
            <template v-else>
                <h3>
                    {{ config.name }}
                    <span class="badge">{{ config.type == 'local' ? '本地' : '远程' }}</span>
                </h3>
            </template>

        </div>

        
    </div>
    
    <!-- 添加 -->
    <div class="create" @click="create">
        <svg viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"/>
        </svg>
    </div>
</template>

<style>
    body{
        margin: 0;
        display: flex;
        min-width: 30rem;
        overflow: auto;
        
        svg{
            fill: currentColor;
            display: inline-block;
        }

        &> .left{
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            height: 100vh;
            background-color: #f5f5f5;
            color: #333;
            text-align: center;
            flex-shrink: 0;

            width: 10rem;

            -webkit-app-region: drag;
            user-select: none;

            &> .logo{
                &> img{
                    width: 5rem;
                    height: 5rem;
                }
                
                &> h1{
                    font-size: 1.25rem;
                    margin: .35rem 0;
                    font-weight: 300;
                }
            }
        }

        &> .right{
            flex-grow: 1;
            position: relative;
            padding: 3rem .5rem 2.5rem 1rem;

            &> div{
                margin-bottom: 1rem;
                display: flex;
                gap: .5rem;
                color: #333;
                padding: .5rem;
                box-shadow: 0 0 .75rem #e1e1e1;
                border-radius: .35rem;

                &> h3{
                    margin: 0;
                    font-weight: 300;
                    padding: 0 .5rem;

                    &> .badge{
                        font-size: .8rem;
                        background-color: #918c8c;
                        color: white;
                        border-radius: .3rem;
                        padding: .1rem .4rem;
                        margin-left: .35rem;
                    }
                }

                &> .left{
                    display: flex;
                    flex-direction: column;
                    gap: .5rem;
                    padding: .35rem;

                    &> *{
                        display: block;
                        padding: .35rem;
                        border-radius: .3rem;
                        transition: all .2s;
                        flex-shrink: 0;

                        &[active=true]{
                            background-color: #e6f7ff;
                        }

                        &> svg{
                            display: block;
                            width: 1.35rem;
                            height: 1.35rem;
                        }
                    }
                }

                &> .right{
                    flex-grow: 1;
                    padding-right: 1.25rem;

                    &> .item{
                        display: flex;
                        flex-wrap: wrap;
                        gap: .5rem;
                        width: 100%;
                        margin: .45rem;
                        align-items: center;

                        > input{
                            flex: 1 0;
                            border-radius: .3em;
                            padding: .35em;
                            background-color: white;
                            border: solid .05em rgb(218, 215, 215);
                            border-bottom: solid .1em rgb(209, 204, 204);
                            transition: all .2s;
                            outline: none;

                            &:focus {
                                border-bottom-color: #0067c0;
                            }
                        }

                        &> span{
                            font-size: .85rem;
                            user-select: none;
                            min-width: 3rem;
                        }

                        &> div{
                            font-size: .7rem;
                            color: #918c8c;
                            width: 100%;
                            padding-left: .5rem;
                            border-left: solid .2rem rgb(167, 167, 167);
                        }
                    }
                }
            }
        }

        &>.create {
            position: absolute;
            bottom: 1rem;
            right: 1rem;
            background-color: #e6f7ff;
            color: #918c8c;
            cursor: pointer;
            transition: all .2s;
            border-radius: 2rem;
            box-shadow: 0 0 1rem rgba(0, 0, 0, .15);

            width: 1.25rem;
            height: 1.25rem;
            padding: .45rem;

            &>svg {
                width: 1.25rem;
                height: 1.25rem;
                margin-right: .5rem;
            }

            &:hover {
                background-color: #d9f0ff;
                color: #333;
                box-shadow: 0 0 .5rem rgba(0, 0, 0, .15);
            }
        }
    }
</style>