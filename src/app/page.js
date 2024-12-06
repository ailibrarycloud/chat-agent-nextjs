"use client";

import { getAgentInfo } from "@/app/api/agent";
import { formatMarkdown } from "@/lib/formatMarkdown";
import { ArrowUpRightIcon, PlusCircleIcon } from "@heroicons/react/20/solid";

import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

const domain = "https://api.ailibrary.ai";
const name = process.env.NEXT_PUBLIC_AGENT_NAMESPACE;

export default function Home() {
  const [loader, setLoader] = useState(false);
  const [messageLoader, setMessageLoader] = useState(false);
  let latency = "";
  let knowledge = [];
  const [session_id, setSessionId] = useState("");
  useEffect(() => {
    if (!sessionStorage.getItem("stream_id")) {
      const stream_id = Date.now();
      sessionStorage.setItem("stream_id", stream_id);
      setSessionId(stream_id);
    } else {
      setSessionId(sessionStorage.getItem("stream_id"));
    }
  }, []);

  const textareaRef = useRef(null);
  const [prompt, setPrompt] = useState("");
  const [agent, setAgent] = useState({});
  const [response, setResponse] = useState("");
  const [messages, setMessages] = useState([]);

  const getAgent = async (name) => {
    setLoader(true);
    const res = await getAgentInfo(name);
    setAgent(res.data);
    setMessages([
      ...messages,
      {
        id: Date.now(),
        role: "assistant",
        content: res.data.intromessage,
      },
    ]);
    setLoader(false);

    // Update metadata
    // document.title = res.data.title || "Playground Assistant";
    // const metaDescription = document.querySelector('meta[name="description"]');
    // if (metaDescription) {
    //   metaDescription.setAttribute("content", res.data.description || "");
    // } else {
    //   const meta = document.createElement("meta");
    //   meta.name = "description";
    //   meta.content = res.data.description || "";
    //   document.head.appendChild(meta);
    // }
  };

  useEffect(() => {
    if (name) {
      getAgent(name);
    }
  }, []);

  const handleInput = () => {
    const textarea = textareaRef.current;
    textarea.style.height = "auto"; // Reset the height
    const newHeight = Math.min(textarea.scrollHeight, 200); // Set the height to the scroll height or 200px, whichever is smaller
    textarea.style.height = `${newHeight}px`;
  };

  const handleKeyDown = async (e) => {
    if (e.key === "Enter" && e.shiftKey) {
      // Break line with Shift + Enter
      e.preventDefault();
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value =
        textarea.value.substring(0, start) +
        "\n" +
        textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      handleInput(); // Adjust the height of the textarea
    } else if (e.key === "Enter") {
      // Make request with Enter
      e.preventDefault();
      setMessageLoader(true);
      await makeRequest(prompt);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  async function makeRequest(prompt) {
    
    textareaRef.current.value = "";
    const textarea = textareaRef.current;
    textarea.style.height = "auto"; // Reset the height
    messages.push({
      id: Date.now(),
      role: "user",
      content: prompt,
    });
    setMessages(messages);

    // order messages by id in ascending order of id
    const llm_messages = messages
      .sort((a, b) => a.id - b.id)
      .map((message) => {
        return {
          id: message.id,
          role: message.role,
          content: message.content,
        };
      });

    try {
      const response = await fetch(`${domain}/v1/agent/${name}/chat`, {
        method: "POST",
        headers: {
          "X-Library-Key": process.env.NEXT_PUBLIC_AI_LIBRARY_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stream: "true",
          session_id: session_id,
          messages: llm_messages,
        }),
      });

      if (!response.body) {
        throw new Error("ReadableStream not supported in this browser.");
      }

      const reader = response.body.getReader();

      const decoder = new TextDecoder();
      let result = "";

      const processChunk = ({ done, value }) => {
        if (done) {
          setMessageLoader(false);
          console.log("Stream complete", latency);
          messages.push({
            id: Date.now(),
            role: "assistant",
            content: result,
            latency: latency,
            knowledge: knowledge.length > 0 ? knowledge : null,
          });
          setMessages(messages);
          setResponse("");
          return;
        }

        const chunk = decoder.decode(value, { stream: true });
        const jsonStrings = chunk.split("\n");

        jsonStrings.forEach((jsonString) => {
          if (jsonString.trim() !== "") {
            try {
              const parsed = JSON.parse(jsonString);
              console.log("parsed", parsed.content);
              if (parsed.object === "chat.completion.chunk") {
                result += parsed.content;
                setResponse((prevResponse) => prevResponse + parsed.content);
              }
              if (parsed.object === "chat.completion.latency") {
                console.log("latency", parsed.content);
                latency = parsed.content;
              }
              if (parsed.object === "chat.completion.form") {
                console.log("form", parsed.content);
                // setForm(parsed.content);
              }
              if (parsed.object === "chat.completion.knowledge") {
                console.log("knowledge", parsed.content);
                knowledge = parsed.content;
              }
            } catch (error) {
              console.error("Error parsing chunk:", error);
            }
          }
        });

        // Read the next chunk
        return reader.read().then(processChunk);
      };

      // Start reading the stream
      reader.read().then(processChunk);
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div className="dark:bg-zinc-900 h-full sm:py-3 relative">
      <div className="h-full">
        <div className="dark:bg-zinc-900 h-full  flex flex-col w-full max-w-xl mx-auto overflow-hidden rounded-lg border dark:border-zinc-400/10">
          {loader ? (
            <div className="flex p-4 h-16 gap-x-2 items-center border-b dark:border-zinc-400/10">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-800 animate-pulse "></div>
              <div className="w-40 h-8 rounded  bg-gray-200 dark:bg-zinc-800 animate-pulse"></div>
            </div>
          ) : (
            <div className="flex items-center justify-between border-b dark:border-zinc-400/10 p-4">
              <div className="flex items-center gap-x-2">
                <img src={agent?.coverimage} className="w-8 h-8 rounded-full" />
                <h1 className="text-lg font-semibold dark:text-gray-200">
                  {agent.title}
                </h1>
              </div>
              <button
                onClick={() => {
                  setMessages([]);
                  //   setOpenSettings(true);
                }}
                className="dark:text-gray-500 text-sm  flex items-center dark:bg-zinc-800 gap-x-2 bg-gray-200 py-2 rounded-3xl px-4"
              >
                <PlusCircleIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                Session
              </button>
            </div>
          )}

          <div className="grow text-sm flex flex-col-reverse overflow-y-auto p-4">
            {loader ? (
              <div className="flex p-2 h-16 gap-x-4 items-center">
                <img src={"/ailibrary.svg"} className="w-8 h-8 rounded-full" />
                <div className="w-40 h-8 rounded  bg-gray-200 dark:bg-zinc-800 animate-pulse"></div>
              </div>
            ) : null}
            {response || messageLoader ? (
              <div className="p-2 mb-2 flex gap-x-4">
                <img src={"/ailibrary.svg"} className="w-8 h-8 rounded-full" />
                {!response ? (
                  <div className="flex items-center gap-x-2">
                    <div className="animate-pulse bg-gray-200 dark:bg-zinc-600 rounded-full h-2 w-2"></div>
                    <div className="animate-pulse bg-gray-200 dark:bg-zinc-600 rounded-full h-2 w-2 delay-75"></div>
                    <div className="animate-pulse bg-gray-200 dark:bg-zinc-600 rounded-full h-2 w-2 delay-150"></div>
                  </div>
                ) : (
                  <Markdown
                    rehypePlugins={[rehypeRaw, remarkGfm]}
                    className="prose prose-slate dark:prose-dark  select-all text-gray-600 dark:text-gray-200"
                  >
                    {formatMarkdown(response)}
                  </Markdown>
                )}
              </div>
            ) : null}
            {messages.length > 0
              ? messages
                  .sort((a, b) => new Date(b.id) - new Date(a.id))
                  .map((message, index) => (
                    <div key={index} className="p-2 mb-3">
                      <div className=" flex gap-x-4">
                        {message.role === "assistant" ? (
                          <img
                            src={"/ailibrary.svg"}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : null}
                        <Markdown
                          rehypePlugins={[rehypeRaw, remarkGfm]}
                          className={`prose prose-slate dark:prose-dark  select-all leading-6
                        ${
                          message.role === "user"
                            ? "bg-gray-200 dark:bg-zinc-600 rounded-lg rounded-br-none text-gray-900 dark:text-gray-200 p-2 ml-auto max-w-[80%]"
                            : "text-gray-600 dark:text-gray-300 mb-3"
                        }
                        `}
                        >
                          {formatMarkdown(message.content)}
                        </Markdown>
                      </div>
                    </div>
                  ))
              : null}
          </div>
          {/* {loader ? <HorizontalLoader /> : null} */}
          <div className="flex items-center border-t p-4 sm:pb-8 dark:border-zinc-400/10 relative dark:bg-zinc-800 bg-zinc-100">
            <textarea
              ref={textareaRef}
              rows={1}
              className="grow border-0 focus:ring-0 focus:outline-none bg-zinc-100 dark:bg-zinc-800 dark:text-gray-200 text-sm border border-gray-200 dark:border-zinc-400/10 rounded-lg "
              placeholder="Type a message"
              onChange={(e) => setPrompt(e.target.value)}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              style={{
                overflow: "hidden",
                resize: "none",
                userSelect: "none",
                touchAction: "manipulation",
                fontSize: "16px", // Prevent zooming on focus in Safari
              }} // Prevent manual resizing and zooming
            ></textarea>
            <button
              onClick={async () => {
                setMessageLoader(true);
                await makeRequest(prompt);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm p-2 rounded-full ml-2"
            >
              <ArrowUpRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
