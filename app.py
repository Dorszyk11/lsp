from flask import Flask, request, jsonify
from lsp_core import run_simulation

app = Flask(__name__)

@app.route("/simulate", methods=["GET"])
def simulate():
    try:
        days = int(request.args.get("days", 30))
        result = run_simulation(days)
        return jsonify({
            "status": "success",
            "days": days,
            "result": result
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
