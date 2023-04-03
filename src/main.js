/*	@shaped/nodejs/reporters/junit (C) 2023 Shaped.ca (forbiddenera)	*
 *	junit XML output reporter for node:test 							*/
import { Transform } from 'stream';
export default class junitReporter extends Transform {
	constructor() { super({ writableObjectMode: true });
					this.lastDepth = -1; this.suiteData = [];
					this.xmlBuffer = [{ depth:0, line: '<?xml version="1.0" encoding="utf-8"?>' }]; }
	tab(d) { let t = ''; for (let i=0;i<d;i++) t = t + '    '; return t; }
	_transform(event, encoding, callback) {
		let pass = 0, fail = 0, skip = 0, err = 0, dis = 0, indent = 0, buf  = ``;

		event.data.depth = event.data.nesting; delete event.data.nesting;
		if (event.data?.testNumber) event.data.testNumber = parseInt(event.data.testNumber);
		if (event.data?.details?.duration_ms) {
			event.data.duration_ms = event.data.details.duration_ms;
			event.data.duration = parseFloat(Number(event.data.details.duration_ms / 1000)).toFixed(6);
			delete event.data.details.duration_ms; }
		(event.data?.details && Object.keys(event.data.details).length === 0) ? delete event.data.details:null;

		switch(true) {
			case (event.data?.skip !== undefined): event.data.state = "skipped";	break;
			case (event.data?.todo !== undefined): event.data.state = "todo";		break;
			default: event.data.state = `${event.type.replace(`test:`,``)}ed`;		}

		switch (event.type) {
			case 'test:start':
				(this.lastDepth == -1)?this.xmlBuffer.push({ depth: 0, line: '<testsuites>' }):null;

				this.xmlBuffer.push({ depth: event.data.depth, name: event.data?.name, line: `${this.tab(event.data.depth+1)}<testsuite name="${event.data.name}" time="*DURATION*" disabled="*DISABLED*" errors="*ERRORS*" tests="*TESTS*" failures="*FAILURES*" skipped="*SKIPPED*">` });
				this.suiteData.push({ depth: event.data.depth, name: event.data?.name, pass: 0, fail: 0, skip: 0, todo: 0, errors: 0, disabled: 0 });

				this.lastDepth = (event.data.depth > this.lastDepth) ? event.data.depth : this.lastDepth;

			  callback(null, ``); break;
			case 'test:pass':
			case 'test:fail':
				if (event.data?.details?.error) {
					event.data.error				= JSON.parse(JSON.stringify(event.data.details.error));	// These values are not copyable: [stack], cause.[stack] cause.[message] cause.[name], [message]
					event.data.error.stack			= event.data.details.error.stack;
					event.data.error.message		= event.data.details.error.message.replaceAll("\n"," ").trim();
					event.data.error.cause.stack 	= event.data.details.error.cause.stack;
					event.data.error.cause.message 	= event.data.details.error.cause.message.replaceAll("\n"," ").trim();
					event.data.error.cause.name 	= event.data.details.error.cause.name;
					delete event.data.details.error;

					if (event.data?.details?.name) { event.data.error.errorName = event.data?.details?.name;
													 delete event.data?.details?.name; }
				}

				(event.data?.details && Object.keys(event.data.details).length === 0) ? delete event.data.details:null;

				for (let x=this.suiteData.length-1;x >= 0;x--)
					if (event.data.depth > this.suiteData[x].depth)
						switch(event.data.state) {
							case "skipped"	: this.suiteData[x].skip++; 	break;
							case "todo"		: this.suiteData[x].todo++; 	break;
							case "error"	: this.suiteData[x].errors++; 	break;
							case "disabled"	: this.suiteData[x].disabled++; break;
							case "failed"	: this.suiteData[x].fail++; 	break;
							default			: this.suiteData[x].pass++;		}

				if (event.data.depth == this.suiteData[this.suiteData.length-1].depth)
					switch(event.data.state) {
						case "skipped"		: this.suiteData[this.suiteData.length-1].skip++; 		break;
						case "todo"			: this.suiteData[this.suiteData.length-1].todo++; 		break;
						case "error"		: this.suiteData[this.suiteData.length-1].errors++; 	break;
						case "disabled"		: this.suiteData[this.suiteData.length-1].disabled++; 	break;
						case "failed"		: this.suiteData[this.suiteData.length-1].fail++; 		break;
						default				: this.suiteData[this.suiteData.length-1].pass++;		}

				for (let x=0;x <=this.suiteData.length-1;x++)
					if (event.data.depth == this.suiteData[x].depth) {
						pass = this.suiteData[x].pass;		fail = this.suiteData[x].fail;
						skip = this.suiteData[x].skip;		err  = this.suiteData[x].errors;
						dis  = this.suiteData[x].disabled;	}

				if (event.data.depth === this.lastDepth) {
					this.xmlBuffer[this.xmlBuffer.length - 1].line = this.xmlBuffer[this.xmlBuffer.length - 1].line.replace(`<testsuite`, `<testcase`)
																			.replace(`*DURATION*`, `${event.data.duration}`)
																  		  	.replace(`tests="*TESTS*" `, ``).replace(`errors="*ERRORS*" `, ``)
																  		  	.replace(`skipped="*SKIPPED*"`, ``).replace(`disabled="*DISABLED*" `, ``)
																  		  	.replace(`failures="*FAILURES*" `, `classname="${event.data.name}"`)
																  		  	.replace(`>`,` file="${event.data.file}">`);

					this.xmlBuffer.push({depth: event.data.depth, name: event.data?.name, line:`${this.tab(event.data.depth + 1)}</testcase>`});
				} else {
					if (this.xmlBuffer[this.xmlBuffer.length-1].depth == event.data.depth) {
						if (event.data.state != "skipped" && event.data.state != "todo") {
							this.xmlBuffer.push({depth: event.data.depth, name: event.data?.name, line:`${this.tab(event.data.depth + 2)}<testcase name="${event.data.name}" time="${event.data.duration}" classname="${event.data.name}" file="${event.data.file}">`});
							indent = 1;
						}

						if (event.data.state == "skipped" || event.data.state == "todo")
							this.xmlBuffer.push({depth: event.data.depth, name: event.data?.name, line:`${this.tab(event.data.depth + 2 + indent)}<skipped type="${event.data.state}" message="${event.data?.skip || event.data?.todo}" />`});

						if (event.data.state == 'failed') {
							this.xmlBuffer.push({depth: event.data.depth, name: event.data?.name, line:`${this.tab(event.data.depth + 3)}<failure type="${event.data.error.cause?.name || event.data.error.failureType}" message="${event.data.error.message}">`});
							this.xmlBuffer.push({depth: event.data.depth, name: event.data?.name, line:`${this.tab(event.data.depth + 4)}${event.data.error.stack}`});
							this.xmlBuffer.push({depth: event.data.depth, name: event.data?.name, line:`${this.tab(event.data.depth + 3)}</failure>`});
						}

						if (event.data.state != "skipped" && event.data.state != "todo") this.xmlBuffer.push({depth: event.data.depth, name: event.data?.name, line:`${this.tab(event.data.depth + 2)}</testcase>`});
					} else for (let x=0;x<this.xmlBuffer.length-1;x++)
							if (this.xmlBuffer[x].depth == event.data.depth)
								this.xmlBuffer[x].line = this.xmlBuffer[x].line.replace(`*DURATION*`, `${event.data.duration}`).replace(`*TESTS*`, `${pass}`)
																  		   	   .replace(`*SKIPPED*`, `${skip}`).replace(`*ERRORS*`, `${err}`)
																  		  	   .replace(`*DISABLED*`, `${dis}`).replace(`*FAILURES*`, `${fail}`);

					this.xmlBuffer.push({depth: event.data.depth, name: event.data?.name, line:`${this.tab(event.data.depth + 1)}</testsuite>`});

					if (event.data.depth == 0) {
						for (let x=0;x<this.xmlBuffer.length-1;x++)
							this.xmlBuffer[x].line = this.xmlBuffer[x].line.replace(`*DURATION*`, `${event.data.duration}`).replace(`*TESTS*`, `${pass}`)
																  		   .replace(`*SKIPPED*`, `${skip}`).replace(`*ERRORS*`, `${err}`)
																  		   .replace(`*DISABLED*`, `${dis}`).replace(`*FAILURES*`, `${fail}`);

						for (let i = 0; i < this.xmlBuffer.length - 1; i++) buf = buf.concat(`${this.xmlBuffer[i].line}\n`);
						this.xmlBuffer = this.xmlBuffer.slice(-1);
					}
				}
			  callback(null, buf); break;
			case 'test:diagnostic':
				if (event.data.message.startsWith(`duration_ms`)) {
					this.xmlBuffer.push({depth: event.data.depth, name: event.data?.name, line: `</testsuites>`});
					this.xmlBuffer.forEach((el)=>{ buf = buf.concat(`${el.line}\n`); }); }
			case 'test:plan': case 'test:coverage': default: callback(null, buf); }
	}
};