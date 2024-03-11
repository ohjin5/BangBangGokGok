// 채팅 관련 컨트롤러
const Chat = require("../models").Chat;
const User = require("../models").User;
const Message = require("../models").Message;
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

// 채팅 목록 페이지
exports.getChats = async (req, res) => {
    try {
        const user = await User.findOne({
            attributes: ["u_seq", "nickname"],
            where: { id: req.params.id },
        });
        const chatLists = await Chat.findAll({
            where: {
                [Op.or]: [{ u_seq: user.u_seq }, { b_seq: user.u_seq }], // 본인이 채팅방 생성자이거나 글 작성자인 경우
            },
            order: [["c_seq", "DESC"]],
        });

        res.render("chat/chatList", {
            chatLists: chatLists,
            u_seq: user.u_seq,
            id: req.params.id,
            nickname: user.nickname,
        });
    } catch (error) {
        res.status(500).send("server error");
    }
};

// 채팅방 상세
exports.getChatRoom = async (req, res) => {
    try {
        const user = await User.findOne({
            attributes: ["u_seq", "nickname", "distance"],
            where: { id: req.query.id },
        });

        // 채팅방 목록 불러오기
        const chatLists = await Chat.findAll({
            where: {
                [Op.or]: [{ u_seq: user.u_seq }, { b_seq: user.u_seq }],
            },
            order: [["c_seq", "DESC"]],
        });

        // 이전 대화 메세지 불러오기
        const messages = await Message.findAll({
            where: { c_seq: req.params.c_seq },
        });

        // 해당 채팅방 제목 불러오기
        const c_title = await Chat.findOne({
            attributes: ["c_title1", "c_title2"],
            where: { c_seq: req.params.c_seq },
        });

        res.render("chat/chat", {
            chatLists: chatLists,
            c_seq: req.params.c_seq,
            c_title: c_title,
            messages: messages,
            user: user,
            id: req.query.id,
            nickname: user.nickname,
            distnace: user.distance,
        });
    } catch (err) {
        res.status(500).send("server error");
    }
};

// 채팅방 생성하기2(사용자 인증 포함)
exports.createChatRoom2 = async (req, res) => {
    try {
        if (req.headers.authorization) {
            const accessToken = req.headers.authorization.split(" ")[1];
            try {
                const auth = jwt.verify(accessToken, process.env.ACCESS_SECRET);
                if (auth) {
                    const { b_seq, u_seq, b_nick, u_nick, id, p_seq } = req.body;

                    // 이미 존재하는 채팅방인지 확인 후, 존재한다면 그 채팅방을 열기
                    const check = await Chat.findOne({
                        where: {
                            [Op.or]: [
                                { u_seq: u_seq, b_seq: b_seq },
                                { u_seq: b_seq, b_seq: u_seq },
                            ],
                        },
                    });
                    if (check) {
                        return res.send({ c_seq: check.c_seq, u_seq: check.u_seq, id: auth.id });
                    } else {
                        // 채팅방이 없을 경우, 새로 생성
                        await Chat.create({
                            c_seq: null,
                            p_seq: p_seq,
                            u_seq: u_seq,
                            b_seq: b_seq,
                            c_title1: u_nick,
                            c_title2: b_nick,
                            unreadcnt: 0,
                            last_user: u_seq,
                        }).then(async (result) => {
                            // 채팅 생성과 동시에 채팅방 오픈하기
                            return res.send({
                                c_seq: result.c_seq,
                                u_seq: result.u_seq,
                                id: auth.id,
                            });
                        });
                    }
                }
            } catch (error) {
                res.send({ result: false, message: "인증된 회원이 아닙니다." });
            }
        } else {
            res.redirect("/users/signin");
        }
    } catch (err) {
        res.status(500).send("server error");
    }
};
