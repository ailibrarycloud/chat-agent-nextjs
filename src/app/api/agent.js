import axios from "axios";

const domain = "https://api.ailibrary.ai"
const key = process.env.NEXT_PUBLIC_AI_LIBRARY_KEY;

export const getAgentInfo = async (name) => {
    console.log(key)
  let res = null;
  let config = {
    method: "get",
    url: `${domain}/v1/agent/${name}`,
    headers: {
      "Content-Type": "application/json",
      "X-Library-Key": key ? key : "d4qgdcs2lgUBvwWDFjC6NeOIrLS87cpoDHlwPL5a",
    },
  };

  await axios
    .request(config)
    .then((response) => {
      res = response;
    })
    .catch((error) => {
      console.log(error);
    });
  return res;
};
