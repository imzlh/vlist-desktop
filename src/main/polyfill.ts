import { IncomingMessage, ServerResponse } from "http";

export class FakeNgxResponse{

    static var: Record<string, any> = {};

    readonly headersOut: Record<string, string> = {};
    readonly args: Record<string, string>;
    
    private $data: Buffer | undefined;

    constructor(
        private res: ServerResponse<IncomingMessage> & {req: IncomingMessage}
    ){
        const url = new URL(this.res.req.url || "", "http://localhost");
        this.args = Object.fromEntries(url.searchParams);
    }

    return(code: number, data?: string){
        this.res.writeHead(code, this.headersOut);
        this.res.end(data ?? '');
    }

    get variables(){
        return FakeNgxResponse.var;
    }

    get method(){
        return this.res.req.method;
    }

    set rawHeadersOut(headers: [string, string][]){
        for(const [key, value] of headers){
            this.headersOut[key] = value;
        }
    }

    get rawHeadersOut(){
        return [];
    }

    get headersIn(): Record<string, string>{
        return this.res.req.headers as any;
    }

    __readAll(){
        return new Promise<Buffer>(rs => {
            const chunks: Buffer[] = [];
            this.res.req.on('data', (chunk) => chunks.push(chunk));
            this.res.req.on('error', () => rs(Buffer.concat(chunks)));
            this.res.req.on('end', () => rs(Buffer.concat(chunks)));
        });
    }

    async __waitReady(){
        const len = parseInt(this.headersIn['content-length']);
        if(len >= 100 * 1024 * 1024){
            this.return(413, "Request Entity Too Large");
            throw new Error("Request Entity Too Large");
        }else{
            this.$data = await this.__readAll();
        }
    }

    get requestBuffer(){
        return this.$data;
    }

    get requestText(){
        if(
            this.res.req.headers['content-type']?.startsWith('text/') ||
            this.res.req.headers['content-type'] == 'application/json'
        ) return new TextDecoder().decode(this.$data);
        else return null;
    }
}